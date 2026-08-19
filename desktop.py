"""Launch TaskNook as a native desktop application.

This boots the Flask API + the built React SPA on a local port and opens it in a
native OS window (via pywebview / WebView2 on Windows), so TaskNook runs like a
regular desktop app instead of in a browser tab.

    python desktop.py

Requires the frontend to be built once (frontend/dist). The TaskNook launcher
scripts do this for you; see the README "Run as a desktop app" section.
"""
import os
import sys
import socket
import threading
import time
import urllib.request

if getattr(sys, "frozen", False):
    # Running from a PyInstaller bundle: assets are extracted under _MEIPASS.
    BASE_DIR = sys._MEIPASS
else:
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))

# A persistent, writable per-user folder. Used for the desktop window's
# browser storage (localStorage, etc.) always — pywebview defaults to a
# private/incognito-style session that forgets everything on close — and for
# the SQLite DB when frozen, since the bundle itself is read-only and (in
# --onefile builds) extracted to a fresh temp dir on every launch.
_data_home = os.environ.get("LOCALAPPDATA") or os.path.expanduser("~")
APP_DATA_DIR = os.path.join(_data_home, "TaskNook")
os.makedirs(APP_DATA_DIR, exist_ok=True)

if getattr(sys, "frozen", False):
    os.environ.setdefault("TASKNOOK_DB", os.path.join(APP_DATA_DIR, "tasknook.db"))

BACKEND_DIR = os.path.join(BASE_DIR, "backend")
DIST_DIR = os.path.join(BASE_DIR, "frontend", "dist")


MB_ICON_ERROR = 0x10
MB_ICON_INFO = 0x40


def _message_box(message, icon):
    """Say something the user will actually see.

    The dialog is for the packaged build only: `--windowed` has no console, so
    print() goes nowhere and the app would appear to do nothing. Run from
    source you have a terminal, and a modal dialog would just block whoever
    (or whatever) launched it.
    """
    print(message)
    if sys.platform == "win32" and getattr(sys, "frozen", False):
        try:
            import ctypes

            ctypes.windll.user32.MessageBoxW(None, message, "TaskNook", icon)
        except Exception:
            pass


def fatal(message):
    _message_box(f"[!] {message}", MB_ICON_ERROR)
    sys.exit(1)


# Held for the life of the process; released by the OS when it exits (including
# on a crash), so a stale lock can never wedge the app shut.
_instance_lock = None


def claim_single_instance():
    """True if we're the only TaskNook; False if one is already running.

    Two instances must never run at once:
      * They'd migrate the same SQLite file concurrently. The loser either
        blocks past SQLite's busy timeout or replays an applied migration —
        an uncaught error which, with no console, is a silent death.
      * Only one can bind DEFAULT_PORT, so the other lands on a random port.
        localStorage is scoped by origin (host *and* port), so that window
        would silently have its own settings and its own login token.

    This is not a rare edge case: the packaged app is a ~40 MB one-file exe
    that spends a few seconds unpacking before any window appears, which is
    precisely when people double-click it again.

    Uses an OS-level lock on a file rather than the file's mere existence —
    the kernel drops it if we're killed, so there's nothing to clean up.
    """
    global _instance_lock
    handle = open(os.path.join(APP_DATA_DIR, "tasknook.lock"), "w")
    try:
        if sys.platform == "win32":
            import msvcrt

            msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            import fcntl

            fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        handle.close()
        return False
    _instance_lock = handle  # keep a reference so it isn't garbage-collected
    return True


if not claim_single_instance():
    # A SELF-TEST that couldn't claim the lock has verified nothing — it never
    # reached the server, the migrations or the pywebview import. Exiting 0
    # there would report success for a stale or broken binary purely because a
    # window happened to be open, which defeats the only check that actually
    # proves the packaged app works.
    if os.environ.get("TASKNOOK_SELFTEST"):
        print("SELFTEST FAILED: another instance holds the lock — nothing was verified")
        sys.exit(1)
    # For a real launch this isn't an error — just tell them where it went, or
    # they'll keep clicking.
    _message_box(
        "TaskNook is already running.\n\nLook for its window (check the taskbar).",
        MB_ICON_INFO,
    )
    sys.exit(0)


# Make the backend package importable and import the configured Flask app.
# create_app() runs at import: it migrates the database and can legitimately
# refuse (e.g. the DB is from a newer release), so guard the import itself.
# NOTE: this must stay *below* the single-instance check — importing app is
# what runs the migrations we're serialising.
sys.path.insert(0, BACKEND_DIR)
try:
    from app import app  # noqa: E402  (create_app() already ran DB init + seeding)
except BaseException as exc:  # noqa: BLE001 — SystemExit must not escape silently
    fatal(f"TaskNook couldn't start.\n\n{exc}")


def find_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


# A stable default port, preferred over a random one. localStorage (the
# token, every preference) is scoped by origin — host *and* port — so if we
# picked a random free port on every launch, the desktop window would visit
# a "new" origin each time and never see its own previous localStorage, even
# though the underlying browser profile is being persisted correctly.
DEFAULT_PORT = 39217


def get_port():
    if os.environ.get("PORT"):
        return int(os.environ["PORT"])
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(("127.0.0.1", DEFAULT_PORT))
        return DEFAULT_PORT
    except OSError:
        return find_free_port()  # default port taken this time; degrade gracefully


def wait_until_up(url, timeout=20):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            urllib.request.urlopen(url, timeout=1)
            return True
        except Exception:
            time.sleep(0.2)
    return False


def serve(port):
    """Serve the app. Prefer waitress (a real WSGI server); fall back to Flask.

    The try only covers the IMPORT: a bind failure inside waitress_serve used
    to die invisibly on this daemon thread, leaving the exe to vanish after
    the 20s health-check timeout with no explanation.
    """
    try:
        import logging
        from waitress import serve as waitress_serve
    except ImportError:
        app.run(host="127.0.0.1", port=port, debug=False, use_reloader=False)
        return

    # Quiet waitress's startup banner via its public logger.
    logging.getLogger("waitress").setLevel(logging.ERROR)
    try:
        waitress_serve(app, host="127.0.0.1", port=port, threads=8)
    except Exception as exc:  # noqa: BLE001 — surfaced, not swallowed
        fatal(f"TaskNook couldn't start its server on port {port}: {exc}")


class DesktopApi:
    """Exposed to the frontend as `window.pywebview.api.*` (pywebview's js_api
    bridge — every method here is callable from JS and returns a Promise).
    Only reachable from the packaged/native window; the dev server and any
    plain browser tab never see `window.pywebview` at all, so the frontend
    treats its absence as "not running as the desktop app" rather than an
    error. `window` is attached after create_window() returns the Window
    object, since the Api instance has to exist before that call to be
    passed in as js_api.
    """

    def __init__(self):
        self.window = None

    def set_always_on_top(self, value):
        """Backs Widget Mode's "Always On Top" toggle. `Window.on_top` is a
        real runtime-settable property (confirmed against this pywebview
        version) — setting it calls straight through to the platform GUI
        toolkit's own always-on-top flag, no restart needed."""
        if self.window is None:
            return False
        self.window.on_top = bool(value)
        return self.window.on_top


def open_in_browser(url):
    """Fallback when no native window is available: open a browser tab and keep
    the server process alive."""
    import webbrowser

    webbrowser.open(url)
    threading.Event().wait()  # block forever so the daemon server survives


def main():
    if not os.path.isfile(os.path.join(DIST_DIR, "index.html")):
        # fatal(), not print: in the frozen --windowed build print() goes
        # nowhere and the app would appear to simply not launch.
        fatal(
            "Frontend build not found (frontend/dist/index.html).\n"
            "Build it once, then relaunch:\n"
            "  cd frontend && npm install && npm run build"
        )

    port = get_port()
    threading.Thread(target=serve, args=(port,), daemon=True).start()

    url = f"http://127.0.0.1:{port}/"
    print(f"Starting TaskNook on {url}")
    if not wait_until_up(url + "api/health"):
        fatal(
            "The TaskNook server did not start in time. If this keeps "
            "happening, check tasknook-error.log next to the database."
        )

    # Diagnostic path used for verification — confirms the server boots (and,
    # in a frozen build, that pywebview was bundled) without opening a window.
    if os.environ.get("TASKNOOK_SELFTEST"):
        try:
            import webview  # noqa: F401

            print("SELFTEST OK (webview import OK)")
        except Exception as exc:  # pragma: no cover
            # From source pywebview is genuinely optional (browser fallback),
            # but in the FROZEN exe a missing bundle is precisely the failure
            # this self-test exists to catch — it must exit non-zero or CI's
            # exit-code check passes a broken artifact.
            if getattr(sys, "frozen", False):
                print(f"SELFTEST FAILED: pywebview missing from the bundle: {exc}")
                sys.exit(1)
            print(f"SELFTEST OK (webview unavailable from source: {exc})")
        return

    try:
        import webview
    except ImportError:
        print("[i] pywebview isn't installed - opening in your browser instead.")
        print("    For the native window, install desktop deps:")
        print("      pip install -r requirements-desktop.txt")
        return open_in_browser(url)

    try:
        api = DesktopApi()
        window = webview.create_window(
            "TaskNook",
            url,
            width=1200,
            height=820,
            min_size=(900, 640),
            js_api=api,
        )
        api.window = window
        # private_mode=False + an explicit storage_path: without these,
        # pywebview defaults to an incognito-style session that throws away
        # localStorage (settings, the auth token, everything) on every close.
        webview.start(
            storage_path=os.path.join(APP_DATA_DIR, "webview"),
            private_mode=False,
        )  # blocks until the window is closed; daemon server exits
    except Exception as exc:
        # e.g. Linux without GTK/Qt WebKit system libraries — degrade gracefully.
        print(f"[i] Could not open a native window ({exc}). Opening in your browser.")
        open_in_browser(url)


if __name__ == "__main__":
    main()
