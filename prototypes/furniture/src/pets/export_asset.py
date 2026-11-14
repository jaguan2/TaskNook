"""Re-export one saved pet Blender source without regenerating its geometry."""
import hashlib
import json
from pathlib import Path

import bpy

OUTPUT = Path(__file__).resolve().parents[2] / 'assets' / 'pet-pilot'


def export_current():
    source = Path(bpy.data.filepath)
    kind = source.stem
    if kind not in ('cat', 'dog', 'bunny') or source.resolve().parent != OUTPUT.resolve():
        raise ValueError('Open and save a pet-pilot Blender file before exporting.')
    bpy.ops.object.select_all(action='SELECT')
    target = OUTPUT / f'{kind}.glb'
    bpy.ops.export_scene.gltf(filepath=str(target), export_format='GLB', use_selection=True,
                              export_animations=True, export_animation_mode='ACTIONS',
                              export_anim_single_armature=True, export_force_sampling=True,
                              export_frame_range=False, export_skins=True, export_morph=True,
                              export_extras=True, export_yup=True, export_texcoords=False)
    manifest = {'version': 1, 'species': kind, 'status': 'workshop pilot',
                'authoringTool': bpy.app.version_string, 'source': source.name, 'model': target.name,
                'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
                'modelSha256': hashlib.sha256(target.read_bytes()).hexdigest(),
                'clips': ['Idle', 'Walk', 'Rest'], 'morphTargets': ['Slender', 'Round'],
                'forward': '+X', 'productionEnabled': False}
    (OUTPUT / f'{kind}.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    print('Exported pet pilot:', kind)


if __name__ == '__main__':
    export_current()
