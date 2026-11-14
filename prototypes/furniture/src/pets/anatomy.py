"""Cozy pet silhouettes: fuse anatomy before weighting, then paint the surface."""
import bpy
from mathutils import Vector

from blender_geometry import finish, joined, oval, tube


def pointed_ear(sign, paint):
    x = sign * .125
    vertices = [(x - .065, -.33, .555), (x + .065, -.33, .555), (x + sign * .025, -.285, .725),
                (x - .055, -.225, .55), (x + .055, -.225, .55), (x + sign * .025, -.245, .715)]
    faces = [(0, 1, 2), (5, 4, 3), (0, 3, 4, 1), (1, 4, 5, 2), (2, 5, 3, 0)]
    mesh = bpy.data.meshes.new('Ear sculpt')
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new('Ear volume', mesh)
    bpy.context.collection.objects.link(obj)
    return finish(obj, obj.name, paint)


def create_anatomy(kind, paints):
    rabbit, dog = kind == 'bunny', kind == 'dog'
    coat = paints['coat']
    head_center = Vector((0, -.23 if rabbit else -.32 if dog else -.29, .46 if rabbit else .47 if dog else .44))
    head_size = (.18, .17, .18) if rabbit else (.22, .20, .21) if dog else (.20, .18, .18)
    body = oval('Body volume', (0, .06 if rabbit else .025, .26 if rabbit else .30 if dog else .27),
                (.22, .27, .24) if rabbit else (.23, .36, .22) if dog else (.20, .32, .19), coat)
    volumes = [body, oval('Head volume', head_center, head_size, coat),
               oval('Neck volume', (0, -.13 if rabbit else -.20, .36 if rabbit else .35), (.14, .17, .15), coat)]
    muzzle_y = head_center.y - head_size[1] + .005
    volumes.append(oval('Muzzle volume', (0, muzzle_y, head_center.z - .055), (.13 if dog else .075, .11 if dog else .045, .075 if dog else .05), coat))
    joints = {'head': head_center, 'eyes': [], 'legs': {}, 'ears': {}}
    for sign, side in ((-1, 'L'), (1, 'R')):
        if rabbit:
            ear = oval('Ear volume', (sign * .09, -.205, .76), (.056, .047, .245), coat)
            ear.rotation_euler.y = sign * .10
            ear_base, ear_tip = (sign * .09, -.21, .60), (sign * .12, -.20, .97)
        elif dog:
            ear = oval('Ear volume', (sign * .205, -.295, .45), (.073, .11, .15), coat)
            ear.rotation_euler.y = -sign * .12
            ear_base, ear_tip = (sign * .18, -.28, .57), (sign * .23, -.29, .31)
        else:
            ear = pointed_ear(sign, coat)
            ear_base, ear_tip = (sign * .125, -.28, .56), (sign * .15, -.265, .715)
        volumes.append(ear)
        joints['ears'][side] = (ear_base, ear_tip)
        for rear, label in ((False, 'Fore'), (True, 'Hind')):
            x, y = sign * (.14 if rear else .125), .19 if rear else -.18
            hip = Vector((x, y, (.27 if rear else .18) if rabbit else .255))
            knee = Vector((x, y + (.025 if rear else -.015), .135 if rear or not rabbit else .10))
            paw = Vector((x, y - (.06 if rabbit and rear else .015), .055))
            radius = .09 if rear else .065
            volumes.append(tube('Leg volume', [hip, hip.lerp(knee, .5), knee, paw], [radius, radius * .95, .057, .047], coat))
            volumes.append(oval('Paw volume', paw + Vector((0, -.025, -.018)), (.065, .13 if rabbit and rear else .092, .037), coat))
            if rear:
                volumes.append(oval('Haunch volume', (x * .75, y, .21 if rabbit else .18), (.13 if rabbit else .10, .16 if rabbit else .12, .16 if rabbit else .13), coat))
            joints['legs'][label + side] = (hip, knee, paw)
    if rabbit:
        volumes.append(oval('Cotton tail volume', (0, .34, .26), (.084, .083, .08), coat))
        joints['tail'] = [(0, .29, .28), (0, .36, .30), (0, .40, .32)]
    else:
        tail = [(0, .29, .34), (.015, .40, .39), (.035, .49, .49), (.035, .50, .60), (.015, .45, .66)]
        volumes.append(tube('Tail volume', tail, [.043 if dog else .033, .038 if dog else .031, .029, .024, .018], coat))
        volumes.append(oval('Tail tip volume', tail[-1], (.020, .020, .022), coat))
        joints['tail'] = [tail[0], tail[2], tail[-1]]
    skin = joined('PetBody', volumes, coat, .008)
    sculpt_finish = skin.modifiers.new('Round sculpt transitions', 'SMOOTH')
    sculpt_finish.factor, sculpt_finish.iterations = .5, 3
    bpy.ops.object.modifier_apply(modifier=sculpt_finish.name)
    for paint in (paints['muzzle'], paints['earLining']):
        skin.data.materials.append(paint)
    for face in skin.data.polygons:
        center = sum((skin.data.vertices[i].co for i in face.vertices), Vector()) / len(face.vertices)
        x, y, z = center
        muzzle = y < muzzle_y + .015 and (x / (.13 if dog else .075)) ** 2 + ((z - head_center.z + .06) / (.067 if dog else .045)) ** 2 < 1
        chest = dog and y < -.16 and (x / .105) ** 2 + ((z - .25) / .12) ** 2 < 1
        center_x = (-1 if x < 0 else 1) * (.09 + .10 * (z - .76))
        if rabbit:
            lining = y < -.229 and ((x - center_x) / .030) ** 2 + ((z - .76) / .185) ** 2 < 1
        else:
            progress = (z - .57) / .15
            center_x = (-1 if x < 0 else 1) * (.125 + .025 * progress)
            lining = not dog and 0 < progress < 1 and abs(x - center_x) < .038 * (1 - progress) and y < -.31 + .04 * progress
        face.material_index = 2 if lining else 1 if muzzle or chest else 0
    result = [(skin, 'body', None)]
    for sign, side in ((-1, 'L'), (1, 'R')):
        eye = Vector((sign * (.085 if rabbit else .105 if dog else .09), head_center.y - head_size[1] * .88, head_center.z + .035))
        joints['eyes'].append((side, eye))
        result.append((oval('Eye' + side, eye, (.014, .015, .021), paints['eyes']), 'rigid', 'Eye' + side))
        if kind == 'cat':
            result.append((oval('Pupil' + side, eye + Vector((0, -.013, 0)), (.005, .004, .014), paints['mouth']), 'rigid', 'Eye' + side))
    nose = Vector((0, muzzle_y - (.105 if dog else .043), head_center.z - .035))
    result.append((oval('Nose', nose, (.026 if dog else .018, .022 if dog else .014, .018 if dog else .012), paints['nose']), 'rigid', 'Head'))
    mouth = [nose + Vector((-.027, .008, -.031)), nose + Vector((0, .004, -.036)), nose + Vector((.027, .008, -.031))]
    result.append((tube('Mouth', mouth, [.0035] * 3, paints['mouth']), 'rigid', 'Head'))
    return result, joints
