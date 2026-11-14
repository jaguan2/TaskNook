"""A shared deforming skeleton with authored joint positions and reusable clips."""
import math

import bpy
from mathutils import Matrix, Vector


def smooth(low, high, value):
    t = max(0, min(1, (value - low) / (high - low)))
    return t * t * (3 - 2 * t)


def create_rig():
    data = bpy.data.armatures.new('ResidentSkeleton')
    rig = bpy.data.objects.new('ResidentRig', data)
    bpy.context.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    definitions = [('Root', (0, 0, 0), (0, 0, .15), None),
                   ('Hips', (0, 0, .87), (0, 0, .95), 'Root'),
                   ('Spine', (0, 0, .95), (0, 0, 1.15), 'Hips'),
                   ('Chest', (0, 0, 1.15), (0, 0, 1.30), 'Spine'),
                   ('Neck', (0, 0, 1.30), (0, 0, 1.40), 'Chest'),
                   ('Head', (0, 0, 1.40), (0, 0, 1.78), 'Neck')]
    for sign, side in ((-1, 'L'), (1, 'R')):
        definitions.extend([(f'Eye{side}', (sign * .087, -.175, 1.568), (sign * .087, -.205, 1.568), 'Head'),
                            (f'UpperArm{side}', (sign * .185, 0, 1.22), (sign * .34, 0, 1.06), 'Chest'),
                            (f'Forearm{side}', (sign * .34, 0, 1.06), (sign * .425, -.015, .865), f'UpperArm{side}'),
                            (f'Hand{side}', (sign * .425, -.015, .865), (sign * .447, -.027, .795), f'Forearm{side}'),
                            (f'Thigh{side}', (sign * .105, 0, .87), (sign * .105, 0, .56), 'Hips'),
                            (f'Shin{side}', (sign * .105, 0, .56), (sign * .105, 0, .08), f'Thigh{side}'),
                            (f'Foot{side}', (sign * .105, 0, .08), (sign * .105, -.15, .05), f'Shin{side}')])
    for name, head, tail, parent in definitions:
        bone = data.edit_bones.new(name)
        bone.head, bone.tail = head, tail
        if parent:
            bone.parent = data.edit_bones[parent]
    bpy.ops.object.mode_set(mode='OBJECT')
    for bone in rig.pose.bones:
        bone.rotation_mode = 'QUATERNION'
    rig.show_in_front = True
    return rig


def blend(a, b, weight):
    return {a: 1 - weight, b: weight}


def bind(obj, kind, side, rig):
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    groups = {bone.name: obj.vertex_groups.new(name=bone.name) for bone in rig.data.bones}
    for vertex in obj.data.vertices:
        x, _, z = vertex.co
        local_side = 'L' if x < 0 else 'R'
        if kind == 'rigid':
            weights = {side: 1}
        elif kind == 'hand':
            weights = {f'Hand{side}': 1}
        elif kind == 'skin':
            weights = blend('Neck', 'Head', smooth(1.34, 1.43, z))
        elif kind == 'trousers':
            leg = blend(f'Shin{local_side}', f'Thigh{local_side}', smooth(.49, .63, z))
            hip = smooth(.76, .86, z)
            weights = {key: value * (1 - hip) for key, value in leg.items()}
            weights['Hips'] = hip
        else:
            torso = blend('Hips', 'Spine', smooth(.83, 1.00, z)) if z < 1.04 else blend('Spine', 'Chest', smooth(1.04, 1.20, z))
            upper = smooth(1.00, 1.12, z)
            arm = blend(f'Forearm{local_side}', f'UpperArm{local_side}', upper)
            mix = smooth(.13 if z > 1.19 else .19, .26, abs(x))
            weights = {key: value * (1 - mix) for key, value in torso.items()}
            weights.update({key: value * mix for key, value in arm.items()})
        for name, value in weights.items():
            if value > 1e-6:
                groups[name].add([vertex.index], value, 'REPLACE')
    modifier = obj.modifiers.new('Resident deformation', 'ARMATURE')
    modifier.object = rig
    obj.parent = rig
    if kind in ('sweater', 'trousers'):
        obj.shape_key_add(name='Basis')
        broad = obj.shape_key_add(name='TorsoFullness')
        for vertex in broad.data:
            x, _, z = vertex.co
            # Local fullness tapers to zero at limb joints; their anchors stay fixed.
            influence = (1 - smooth(.13, .25, abs(x))) * (1 - smooth(1.15, 1.28, z)) * smooth(.68, .83, z)
            vertex.co.x += x * .25 * influence


def aim(rig, name, start, end):
    bone = rig.pose.bones[name]
    rest = rig.data.bones[name]
    delta = (rest.tail_local - rest.head_local).rotation_difference(Vector(end) - Vector(start))
    matrix = (delta @ rest.matrix_local.to_quaternion()).to_matrix().to_4x4()
    matrix.translation = Vector(start)
    bone.matrix = matrix
    bpy.context.view_layer.update()


def pose(rig, name, phase):
    seated = name in ('Sit', 'Type', 'AnklesCrossed')
    sleeping = name == 'Sleep'
    lift = -.21 if seated else 0
    breathe = .004 * math.sin(phase * 2 * math.pi)
    for bone in rig.pose.bones:
        bone.matrix_basis = Matrix.Identity(4)
    root = Matrix.Rotation(-math.pi / 2, 4, 'X') if sleeping else Matrix.Identity(4)
    if sleeping:
        root.translation = Vector((0, -.85, .69))
    def target(bone, start, end):
        aim(rig, bone, root @ Vector(start), root @ Vector(end))
    target('Root', (0, 0, 0), (0, 0, .15))
    target('Hips', (0, 0, .87 + lift), (0, 0, .95 + lift))
    target('Spine', (0, 0, .95 + lift), (0, -.01 if name == 'Type' else 0, 1.15 + lift + breathe))
    target('Chest', (0, -.01 if name == 'Type' else 0, 1.15 + lift + breathe), (0, -.025 if name == 'Type' else 0, 1.30 + lift + breathe))
    head_y = -.16 if sleeping else -.02 if name == 'Type' else 0
    target('Neck', (0, -.025 if name == 'Type' else 0, 1.30 + lift + breathe), (0, head_y, 1.40 + lift + breathe))
    target('Head', (0, head_y, 1.40 + lift + breathe), (.012 * math.sin(phase * 2 * math.pi), head_y - (.01 if name == 'Type' else 0), 1.78 + lift + breathe))
    for sign, side in ((-1, 'L'), (1, 'R')):
        rig.pose.bones['Eye' + side].scale.z = .12 if sleeping else 1
        hip = Vector((sign * .105, 0, .87 + lift))
        if seated:
            knee = hip + Vector((sign * .018, -.299, -.082))
            ankle = knee + Vector((0, -.012, -.480))
            ankle.z = .08
            if name == 'AnklesCrossed':
                ankle.x = -sign * .03
        else:
            stride = .19 * sign * math.sin(phase * 2 * math.pi) if name == 'Walk' else (.08 * sign if sleeping else 0)
            knee = hip + Vector((0, -.31 * math.sin(stride), -.31 * math.cos(stride)))
            bend = max(0, -sign * math.sin(phase * 2 * math.pi)) * .32 if name == 'Walk' else (.20 if sleeping else 0)
            ankle = knee + Vector((0, -.48 * math.sin(stride - bend), -.48 * math.cos(stride - bend)))
        target('Thigh' + side, hip, knee)
        target('Shin' + side, knee, ankle)
        target('Foot' + side, ankle, ankle + Vector((0, -.15, -.03)))
        shoulder = Vector((sign * .185, -.02 if name == 'Type' else 0, 1.22 + lift + breathe))
        elbow = shoulder + Vector((sign * .057, -.04, -.23))
        wrist = elbow + Vector((sign * .005, -.035, -.19))
        if seated:
            elbow = shoulder + Vector((sign * .060, -.045, -.225))
            wrist = elbow + Vector((-sign * .105, -.175, -.015))
        if name == 'Type':
            elbow = shoulder + Vector((sign * .060, -.15, -.155))
            wrist = elbow + Vector((-sign * .066, -.15, .145 + .005 * math.sin(phase * 2 * math.pi + sign)))
        if sleeping:
            elbow = shoulder + Vector((sign * .08, -.10, -.20))
            wrist = elbow + Vector((-sign * .13, -.11, -.11))
        if name == 'Walk':
            elbow.y += .07 * sign * math.sin(phase * 2 * math.pi)
            wrist.y += .10 * sign * math.sin(phase * 2 * math.pi)
        target('UpperArm' + side, shoulder, elbow)
        target('Forearm' + side, elbow, wrist)
        hand_direction = Vector((0, -.07, -.008)) if name == 'Type' else Vector((-sign * .005, -.018 if seated else -.005, -.067))
        target('Hand' + side, wrist, wrist + hand_direction)


def animate(rig):
    scene = bpy.context.scene
    scene.render.fps = 24
    clips = ('Idle', 'Walk', 'Sit', 'Type', 'Sleep', 'AnklesCrossed')
    for name in clips:
        rig.animation_data_clear()
        action = bpy.data.actions.new(name)
        rig.animation_data_create()
        rig.animation_data.action = action
        for frame in range(1, 98, 6):
            scene.frame_set(frame)
            pose(rig, name, (frame - 1) / 96)
            for bone in rig.pose.bones:
                for prop in ('location', 'rotation_quaternion', 'scale'):
                    bone.keyframe_insert(prop, frame=frame, group=bone.name)
        track = rig.animation_data.nla_tracks.new()
        track.name = name
        track.strips.new(name, 1, action)
        # Keep actions independently exportable without stacking poses together.
        track.mute = True
        action.use_fake_user = True
    rig.animation_data.action = None
    scene.frame_start, scene.frame_end = 1, 97
    pose(rig, 'Idle', 0)
    return clips
