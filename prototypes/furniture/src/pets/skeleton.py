"""Blended quadruped joints. Paws retain ground contact while the body settles."""
import math

import bpy
from mathutils import Matrix, Vector


def smooth(low, high, value):
    t = max(0, min(1, (value - low) / (high - low)))
    return t * t * (3 - 2 * t)


def create_rig(joints):
    data = bpy.data.armatures.new('PetSkeleton')
    rig = bpy.data.objects.new('PetRig', data)
    bpy.context.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    definitions = [('Root', (0, 0, 0), (0, 0, .12), None),
                   ('Body', (0, .15, .31), (0, -.15, .37), 'Root'),
                   ('Head', joints['head'], joints['head'] + Vector((0, -.12, .01)), 'Body')]
    for side, (start, end) in joints['ears'].items():
        definitions.append(('Ear' + side, start, end, 'Head'))
    for side, eye in joints['eyes']:
        definitions.append(('Eye' + side, eye, eye + Vector((0, -.025, 0)), 'Head'))
    for name, (hip, knee, paw) in joints['legs'].items():
        definitions.extend([('Upper' + name, hip, knee, 'Body'), ('Lower' + name, knee, paw, 'Upper' + name),
                            ('Paw' + name, paw, paw + Vector((0, -.09, -.02)), 'Lower' + name)])
    a, b, c = joints['tail']
    definitions.extend([('Tail', a, b, 'Body'), ('TailTip', b, c, 'Tail')])
    for name, start, end, parent in definitions:
        bone = data.edit_bones.new(name)
        bone.head, bone.tail = start, end
        if parent:
            bone.parent = data.edit_bones[parent]
    bpy.ops.object.mode_set(mode='OBJECT')
    for bone in rig.pose.bones:
        bone.rotation_mode = 'QUATERNION'
    rig.show_in_front = True
    return rig


def body_weights(point, kind):
    x, y, z = point
    head = smooth(.30, .46, z) * smooth(.08, .23, -y)
    ear = (smooth(.14, .24, abs(x)) * smooth(.30, .44, z) * smooth(.10, .24, -y)) if kind == 'dog' else smooth(.55, .68, z) * smooth(.045, .10, abs(x)) * smooth(.07, .18, -y)
    if ear > .001:
        return {'Head': 1 - ear, 'Ear' + ('L' if x < 0 else 'R'): ear}
    tail = smooth(.29, .40, y) * smooth(.21, .33, z)
    if tail > .001:
        tip = smooth(.46, .62, z) if kind != 'bunny' else smooth(.33, .39, y)
        return {'Body': 1 - tail, 'Tail': tail * (1 - tip), 'TailTip': tail * tip}
    if head > .99:
        return {'Head': 1}
    leg = (1 - smooth(.13, .25, z)) * smooth(.055, .12, abs(x))
    name = ('Fore' if y < 0 else 'Hind') + ('L' if x < 0 else 'R')
    paw = 1 - smooth(.05, .115, z)
    upper = smooth(.11, .22, z)
    return {'Head': head, 'Body': (1 - head) * (1 - leg),
            'Upper' + name: (1 - head) * leg * (1 - paw) * upper,
            'Lower' + name: (1 - head) * leg * (1 - paw) * (1 - upper),
            'Paw' + name: (1 - head) * leg * paw}


def bind(obj, mode, bone_name, rig, kind):
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    groups = {bone.name: obj.vertex_groups.new(name=bone.name) for bone in rig.data.bones}
    weights = []
    for vertex in obj.data.vertices:
        current = body_weights(vertex.co, kind) if mode == 'body' else {bone_name: 1}
        weights.append(current)
        total = sum(current.values())
        for name, value in current.items():
            if value > 1e-6:
                groups[name].add([vertex.index], value / total, 'REPLACE')
    modifier = obj.modifiers.new('Continuous pet deformation', 'ARMATURE')
    modifier.object = rig
    obj.parent = rig
    if mode == 'body':
        obj.shape_key_add(name='Basis')
        for name, factor in [('Slender', -.12), ('Round', .08)]:
            shape = obj.shape_key_add(name=name)
            for i, vertex in enumerate(shape.data):
                influence = weights[i].get('Body', 0)
                vertex.co.x *= 1 + factor * influence
                if name == 'Round':
                    vertex.co.z += max(0, vertex.co.z - .10) * .08 * influence


def aim(rig, name, start, end):
    rest = rig.data.bones[name]
    delta = (rest.tail_local - rest.head_local).rotation_difference(Vector(end) - Vector(start))
    matrix = (delta @ rest.matrix_local.to_quaternion()).to_matrix().to_4x4()
    matrix.translation = Vector(start)
    rig.pose.bones[name].matrix = matrix
    bpy.context.view_layer.update()


def pose(rig, joints, kind, clip, phase):
    rest = clip == 'Rest'
    walking = clip == 'Walk'
    drop = .015 if kind == 'bunny' else .065
    drop = drop if rest else 0
    for bone in rig.pose.bones:
        bone.matrix_basis = Matrix.Identity(4)
    body = rig.data.bones['Body']
    aim(rig, 'Body', body.head_local - Vector((0, 0, drop)), body.tail_local - Vector((0, 0, drop)))
    if rest:
        rig.pose.bones['Body'].scale.z = .85 if kind == 'bunny' else .78
    head = rig.data.bones['Head']
    aim(rig, 'Head', head.head_local - Vector((0, 0, drop)), head.tail_local - Vector((0, 0, drop)))
    if not rest:
        rig.pose.bones['Head'].rotation_quaternion.rotate(Vector((0, 0, 1)).rotation_difference(Vector((.025 * math.sin(phase * math.tau), 0, 1))))
    for side in ('L', 'R'):
        rig.pose.bones['Eye' + side].scale.z = .10 if rest else 1
    for i, (name, (hip, knee, paw)) in enumerate(joints['legs'].items()):
        hip = hip - Vector((0, 0, drop))
        foot = paw.copy()
        if walking:
            offset = (0 if name.startswith('Hind') else math.pi) if kind == 'bunny' else (0 if i in (0, 3) else math.pi)
            wave = math.sin(phase * math.tau + offset)
            foot.y += .055 * min(1, (hip - paw).length / .255) * wave
            foot.z += max(0, wave) * .035
        joint = hip.lerp(foot, .58) + Vector((0, (hip - paw).length * .10, 0))
        aim(rig, 'Upper' + name, hip, joint)
        aim(rig, 'Lower' + name, joint, foot)
        aim(rig, 'Paw' + name, foot, foot + Vector((0, -.09, -.02)))
    if rest and kind != 'bunny':
        a = Vector(joints['tail'][0]) - Vector((0, 0, drop))
        b, c = Vector((.18, .32, .22)), Vector((.24, .13, .17))
        aim(rig, 'Tail', a, b)
        aim(rig, 'TailTip', b, c)


def animate(rig, joints, kind):
    scene = bpy.context.scene
    scene.render.fps = 24
    for clip in ('Idle', 'Walk', 'Rest'):
        rig.animation_data_clear()
        action = bpy.data.actions.new(clip)
        rig.animation_data_create()
        rig.animation_data.action = action
        for frame in range(1, 98, 8):
            scene.frame_set(frame)
            pose(rig, joints, kind, clip, (frame - 1) / 96)
            for bone in rig.pose.bones:
                for prop in ('location', 'rotation_quaternion', 'scale'):
                    bone.keyframe_insert(prop, frame=frame, group=bone.name)
        action.use_fake_user = True
    rig.animation_data.action = None
    scene.frame_start, scene.frame_end = 1, 97
    pose(rig, joints, kind, 'Idle', 0)
