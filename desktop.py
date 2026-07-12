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

# Make the backend package importable and import the configured Flask app.
sys.path.insert(0, BACKEND_DIR)
from app import app  # noqa: E402  (create_app() already ran DB init + seeding)


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
    """Serve the app. Prefer waitress (a real WSGI server); fall back to Flask."""
    try:
        import logging
        from waitress import serve as waitress_serve

        # Quiet waitress's startup banner via its public logger.
        logging.getLogger("waitress").setLevel(logging.ERROR)
        waitress_serve(app, host="127.0.0.1", port=port, threads=8)
    except ImportError:
        app.run(host="127.0.0.1", port=port, debug=False, use_reloader=False)


def open_in_browser(url):
    """Fallback when no native window is available: open a browser tab and keep
    the server process alive."""
    import webbrowser

    webbrowser.open(url)
    threading.Event().wait()  # block forever so the daemon server survives


def main():
    if not os.path.isfile(os.path.join(DIST_DIR, "index.html")):
        print("[!] Frontend build not found (frontend/dist/index.html).")
        print("    Build it once, then relaunch:")
        print("      cd frontend && npm install && npm run build")
        sys.exit(1)

    port = get_port()
    threading.Thread(target=serve, args=(port,), daemon=True).start()

    url = f"http://127.0.0.1:{port}/"
    print(f"Starting TaskNook on {url}")
    if not wait_until_up(url + "api/health"):
        print("[!] The TaskNook server did not start in time.")
        sys.exit(1)

    # Diagnostic path used for verification — confirms the server boots (and,
    # in a frozen build, that pywebview was bundled) without opening a window.
    if os.environ.get("TASKNOOK_SELFTEST"):
        try:
            import webview  # noqa: F401

            print("SELFTEST OK (webview import OK)")
        except Exception as exc:  # pragma: no cover
            print(f"SELFTEST OK (webview unavailable: {exc})")
        return

    try:
        import webview
    except ImportError:
        print("[i] pywebview isn't installed - opening in your browser instead.")
        print("    For the native window, install desktop deps:")
        print("      pip install -r requirements-desktop.txt")
        return open_in_browser(url)

    try:
        webview.create_window(
            "TaskNook",
            url,
            width=1200,
            height=820,
            min_size=(900, 640),
        )
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
