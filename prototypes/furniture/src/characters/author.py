"""Build the resident pilot: blender --background --python src/characters/author.py.

The .blend is editable source, the GLB is its portable runtime study. Re-running
this script regenerates both; export an edited .blend separately to retain edits.
"""
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix

SOURCE = Path(__file__).resolve().parent
sys.path.insert(0, str(SOURCE.parent))
sys.path.insert(0, str(SOURCE))
from geometry import create_surfaces  # noqa: E402
from blender_geometry import material  # noqa: E402
from rig import animate, bind, create_rig  # noqa: E402
from export_asset import export_current  # noqa: E402

OUTPUT = SOURCE.parents[1] / 'assets' / 'character-pilot'
OUTPUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

colours = {'skin': '#edc39e', 'outfit': '#7faf8f', 'trouser': '#4a3a5b',
           'hairColor': '#3a3142', 'shoeColor': '#2b2350', 'sole': '#ddcfb8',
           'eyeColor': '#3a3142', 'mouth': '#916850'}
paints = {key: material(key, value) for key, value in colours.items()}
surfaces = create_surfaces(paints)
rig = create_rig()
for obj, kind, side in surfaces:
    bind(obj, kind, side, rig)
animate(rig)
rig.scale = (58 / (48 / math.sqrt(2)) / 1.825,) * 3
for obj, _, _ in surfaces:
    # glTF skinned meshes belong at the scene root with identity transforms.
    # Bake the unit conversion into their vertices, including shape keys.
    obj.parent = None
    obj.data.transform(Matrix.Scale(rig.scale.x, 4), shape_keys=True)
rig['pilot'] = 'Resident skinned mesh study; production SVG is unchanged'
rig['forward'] = '-Y in Blender / +Z in glTF'
rig['heightReference'] = 'Approximately 3.7 heads; room conversion uses 48/sqrt(2) pixels per unit'
bpy.context.scene.world.color = (.35, .30, .26)
bpy.context.scene.render.engine = 'BLENDER_EEVEE_NEXT'
bpy.context.scene.view_settings.view_transform = 'Standard'
bpy.context.scene.frame_set(1)
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.object.select_all(action='SELECT')
bpy.context.view_layer.objects.active = rig
bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT / 'resident.blend'), check_existing=False, compress=True)
export_current()
