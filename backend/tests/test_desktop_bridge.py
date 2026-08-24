"""Static safety checks for the native pywebview bridge.

Importing desktop.py has intentional launch side effects (instance lock,
database setup), so inspect its syntax tree instead of importing it in pytest.
"""
import ast
from pathlib import Path


DESKTOP_PY = Path(__file__).resolve().parents[2] / "desktop.py"


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
