"""Static safety checks for the native pywebview bridge.

Importing desktop.py has intentional launch side effects (instance lock,
database setup), so inspect its syntax tree instead of importing it in pytest.
"""
import ast
from pathlib import Path
import threading


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
    tree = ast.parse(DESKTOP_PY.read_text(encoding="utf-8"))
    bridge = next(
        node
        for node in tree.body
        if isinstance(node, ast.ClassDef) and node.name == "DesktopApi"
    )
    module = ast.fix_missing_locations(ast.Module(body=[bridge], type_ignores=[]))
    namespace = {"threading": threading}
    exec(compile(module, str(DESKTOP_PY), "exec"), namespace)  # noqa: S102 - local source AST

    class Window:
        on_top = True

    api = namespace["DesktopApi"]()
    api._window = Window()
    assert api.set_always_on_top(False) is True
    assert api._window.on_top is False
