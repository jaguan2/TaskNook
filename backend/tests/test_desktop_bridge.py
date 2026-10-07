"""Static safety checks for the native pywebview bridge.

Importing desktop.py has intentional launch side effects (instance lock,
database setup), so inspect its syntax tree instead of importing it in pytest.
"""
import ast
from pathlib import Path
import threading
import sys
from types import SimpleNamespace


DESKTOP_PY = Path(__file__).resolve().parents[2] / "desktop.py"


def _function_from_desktop(name):
    tree = ast.parse(DESKTOP_PY.read_text(encoding="utf-8"))
    function = next(
        node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == name
    )
    module = ast.fix_missing_locations(ast.Module(body=[function], type_ignores=[]))
    namespace = {}
    exec(compile(module, str(DESKTOP_PY), "exec"), namespace)  # noqa: S102 - local source AST
    return namespace[name]


def _bridge():
    tree = ast.parse(DESKTOP_PY.read_text(encoding="utf-8"))
    bridge = next(node for node in tree.body if isinstance(node, ast.ClassDef) and node.name == "DesktopApi")
    module = ast.fix_missing_locations(ast.Module(body=[bridge], type_ignores=[]))
    namespace = {
        "threading": threading, "sys": sys,
        "WIDGET_WINDOW_SIZE": (340, 300), "NORMAL_MIN_SIZE": (900, 640),
        "NORMAL_WINDOW_SIZE": (1200, 820),
    }
    exec(compile(module, str(DESKTOP_PY), "exec"), namespace)
    return namespace["DesktopApi"]()


def test_port_override_is_bounded_before_the_server_uses_it():
    parse_port = _function_from_desktop("parse_port")
    assert parse_port("39217") == 39217
    assert parse_port(1) == 1
    for bad in (None, "", "not-a-port", 0, -1, 65536):
        assert parse_port(bad) is None


def test_native_window_never_becomes_public_javascript_api():
    tree = ast.parse(DESKTOP_PY.read_text(encoding="utf-8"))
    bridge = next(
        node
        for node in tree.body
        if isinstance(node, ast.ClassDef) and node.name == "DesktopApi"
    )

    public_methods = {
        node.name
        for node in bridge.body
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
        and not node.name.startswith("_")
    }
    assert public_methods == {"set_always_on_top", "set_widget_mode"}

    # pywebview recursively walks public data attributes too. `self.window =`
    # was enough to make it traverse WinForms accessibility/COM objects until
    # the native window stopped responding.
    public_self_writes = {
        node.attr
        for node in ast.walk(bridge)
        if isinstance(node, ast.Attribute)
        and isinstance(node.ctx, (ast.Store, ast.Del))
        and isinstance(node.value, ast.Name)
        and node.value.id == "self"
        and not node.attr.startswith("_")
    }
    assert public_self_writes == set()


def test_always_on_top_reports_success_when_turning_off():
    """The bridge result is an operation status, not the resulting on/off bit."""
    class Window:
        on_top = True

    api = _bridge()
    api._on_native_thread = lambda action: action()
    api._window = Window()
    assert api.set_always_on_top(False) is True
    assert api._window.on_top is False


class _Window:
    x, y, width, height = 80, 110, 1200, 820

    def __init__(self):
        self.operations = []
        self.title = "TaskNook"

    def restore(self):
        self.operations.append("restore")
        self.x, self.y, self.width, self.height = 80, 110, 1200, 820

    def resize(self, width, height):
        self.operations.append(("resize", width, height))
        self.width, self.height = width, height

    def move(self, x, y):
        self.x, self.y = x, y

    def set_title(self, title):
        self.title = title

    def maximize(self):
        self.operations.append("maximize")


def test_widget_restores_home_bounds_after_moving_and_repeated_requests():
    api = _bridge()
    window = api._window = _Window()
    api._set_widget_chrome = lambda enabled: window.operations.append(("chrome", enabled))
    assert api.set_widget_mode(True)
    assert (window.width, window.height, window.title) == (340, 300, "TaskNook Timer")
    assert window.operations[:2] == [("chrome", True), ("resize", 340, 300)]
    window.move(500, 600)
    assert api.set_widget_mode(True)
    assert window.operations.count(("chrome", True)) == 1
    assert api.set_widget_mode(False)
    assert (window.x, window.y, window.width, window.height, window.title) == (80, 110, 1200, 820, "TaskNook")
    assert window.operations[-2:] == [("chrome", False), ("resize", 1200, 820)]
    assert api._normal_bounds is None


def test_maximized_entry_remembers_the_restored_bounds():
    api = _bridge()
    window = api._window = _Window()
    api._set_widget_chrome = lambda enabled: None
    api._is_maximized = True
    window.x, window.y, window.width, window.height = 0, 0, 1920, 1080
    assert api.set_widget_mode(True)
    assert api._normal_bounds == {"x": 80, "y": 110, "width": 1200, "height": 820}
    assert api.set_widget_mode(False)
    assert window.operations[-1] == "maximize"


def test_windows_chrome_changes_on_ui_thread_and_restores_dpi_scaled_limits(monkeypatch):
    api = _bridge()
    # Stand-ins for .NET verify thread dispatch and restore semantics without
    # importing desktop.py's server or requiring a native window in pytest.
    size = lambda width, height: (width, height)
    monkeypatch.setitem(sys.modules, "System", SimpleNamespace(Action=lambda action: action))
    monkeypatch.setitem(sys.modules, "System.Drawing", SimpleNamespace(Size=size))
    monkeypatch.setitem(sys.modules, "System.Windows.Forms", SimpleNamespace(FormBorderStyle=SimpleNamespace(**{"None": "frameless"})))
    monkeypatch.setattr(sys, "platform", "win32")
    dispatched = []
    native = SimpleNamespace(
        FormBorderStyle="Sizable", MinimumSize=(1350, 960), MaximumSize=(0, 0),
        MaximizeBox=True, DeviceDpi=144, InvokeRequired=True,
    )

    def invoke(action):
        dispatched.append(True)
        action()

    native.Invoke = invoke
    api._window = SimpleNamespace(native=native)
    api._set_widget_chrome(True)
    assert dispatched == [True]
    assert native.FormBorderStyle == "frameless"
    assert native.MinimumSize == native.MaximumSize == (510, 450)
    assert native.MaximizeBox is False
    api._set_widget_chrome(False)
    assert native.FormBorderStyle == "Sizable"
    assert native.MinimumSize == (1350, 960)
    assert native.MaximumSize == (0, 0)
    assert native.MaximizeBox is True
    assert api._normal_chrome is None


def test_pin_changes_are_dispatched_to_the_windows_ui_thread(monkeypatch):
    api = _bridge()
    monkeypatch.setattr(sys, "platform", "win32")
    monkeypatch.setitem(sys.modules, "System", SimpleNamespace(Action=lambda action: action))
    calls = []
    native = SimpleNamespace(InvokeRequired=True)
    api._window = SimpleNamespace(native=native, on_top=False)

    def invoke(action):
        calls.append(api._window.on_top)
        action()

    native.Invoke = invoke
    assert api.set_always_on_top(True)
    assert api._window.on_top is True
    assert api.set_always_on_top(False)
    assert api._window.on_top is False
    assert calls == [False, True]
