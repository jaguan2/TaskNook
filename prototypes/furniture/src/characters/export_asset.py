"""Export a saved, editable pilot without re-running its seed construction.

blender assets/character-pilot/resident.blend --background --python src/characters/export_asset.py
"""
import hashlib
import json
from pathlib import Path

import bpy

OUTPUT = Path(__file__).resolve().parents[2] / 'assets' / 'character-pilot'


def export_current():
    source = OUTPUT / 'resident.blend'
    if Path(bpy.data.filepath).resolve() != source.resolve():
        raise ValueError('Open and save the pilot resident.blend before exporting.')
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=str(OUTPUT / 'resident.glb'), export_format='GLB',
                              use_selection=True, export_animations=True,
                              export_animation_mode='ACTIONS', export_nla_strips=True,
                              export_anim_single_armature=True, export_force_sampling=True,
                              export_frame_range=False, export_skins=True, export_morph=True,
                              export_extras=True, export_yup=True, export_texcoords=False)
    colours = {'skin': '#edc39e', 'outfit': '#7faf8f', 'trouser': '#4a3a5b',
               'hairColor': '#3a3142', 'shoeColor': '#2b2350', 'sole': '#ddcfb8',
               'eyeColor': '#3a3142', 'mouth': '#916850'}
    manifest = {'version': 1, 'status': 'workshop pilot', 'authoringTool': bpy.app.version_string,
                'source': source.name, 'model': 'resident.glb',
                'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
                'modelSha256': hashlib.sha256((OUTPUT / 'resident.glb').read_bytes()).hexdigest(),
                'clips': ['Idle', 'Walk', 'Sit', 'Type', 'Sleep', 'AnklesCrossed'],
                'appearance': colours, 'supportedLook': {'hair': 'short', 'garment': 'sweater', 'pants': 'trousers', 'shoes': 'sneakers'},
                'morphTargets': ['TorsoFullness'], 'productionEnabled': False}
    (OUTPUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    print('Resident pilot exported:', OUTPUT)


if __name__ == '__main__':
    export_current()
