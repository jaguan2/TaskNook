"""Generate editable pet studies; production growth/state remain in lib/pets.js."""
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix

SOURCE = Path(__file__).resolve().parent
sys.path.insert(0, str(SOURCE.parent))
sys.path.insert(0, str(SOURCE))
from blender_geometry import material  # noqa: E402
from anatomy import create_anatomy  # noqa: E402
from skeleton import animate, bind, create_rig  # noqa: E402
from export_asset import export_current  # noqa: E402

OUTPUT = SOURCE.parents[1] / 'assets' / 'pet-pilot'
OUTPUT.mkdir(parents=True, exist_ok=True)
catalog = json.loads((SOURCE.parents[1] / 'assets' / 'manifest.json').read_text())['models']
reference = json.loads((OUTPUT / 'source-art.json').read_text())['referenceBounds']
palettes = {
    'cat': {'coat': '#4b3e50', 'muzzle': '#766174', 'earLining': '#ba929a', 'eyes': '#ead5a2', 'nose': '#b78692', 'mouth': '#302637'},
    'dog': {'coat': '#c98a4b', 'muzzle': '#f2e7dc', 'earLining': '#bc8151', 'eyes': '#352d36', 'nose': '#45343a', 'mouth': '#74513f'},
    'bunny': {'coat': '#d9d2e4', 'muzzle': '#f1e8e9', 'earLining': '#d29fac', 'eyes': '#443647', 'nose': '#c18f9e', 'mouth': '#a17e91'},
}
for kind, colours in palettes.items():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)
    for collection in (bpy.data.meshes, bpy.data.materials, bpy.data.armatures):
        for block in list(collection):
            if block.users == 0:
                collection.remove(block)
    paints = {key: material(key, value) for key, value in colours.items()}
    surfaces, joints = create_anatomy(kind, paints)
    rig = create_rig(joints)
    for obj, mode, name in surfaces:
        bind(obj, mode, name, rig, kind)
    vertices = [obj.matrix_world @ vertex.co for obj, _, _ in surfaces for vertex in obj.data.vertices]
    vertical = reference[kind]['height'] / (48 / math.sqrt(2)) / max(v.z for v in vertices)
    # Match the actual drawing's height, with compact depth along the body's
    # long axis so the existing placement footprint remains usable.
    lateral = min(vertical, (catalog[kind]['depth'] / 2 - .006) / max(abs(v.x) for v in vertices))
    length = min(vertical, (catalog[kind]['width'] / 2 - .006) / max(abs(v.y) for v in vertices))
    conversion = Matrix.Rotation(math.pi / 2, 4, 'Z') @ Matrix.Diagonal((lateral, length, vertical, 1))
    animate(rig, joints, kind)
    for obj, _, _ in surfaces:
        obj.parent = None
        obj.data.transform(conversion, shape_keys=True)
    rig.scale = (lateral, length, vertical)
    rig.rotation_euler.z = math.pi / 2
    rig['species'] = kind
    rig['forward'] = '+X in glTF; long body fits the catalog width axis'
    rig['growth'] = 'Apply stage scale and Head bone scale after evaluating animation'
    bpy.context.scene.frame_set(1)
    bpy.context.preferences.filepaths.save_version = 0
    bpy.context.scene.world.color = (.35, .30, .26)
    bpy.context.scene.view_settings.view_transform = 'Standard'
    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT / f'{kind}.blend'), check_existing=False, compress=True)
    export_current()
