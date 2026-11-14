"""Editable, closed character surfaces. Blender coordinates: Z up, -Y front."""
import math

import bpy
from mathutils import Vector


from blender_geometry import finish, joined, oval, tube


def hair(paint):
    """One thick wig with unequal fringe lobes and a lower rear hairline."""
    vertices, faces, sides, rows = [], [], 48, 15
    for layer in range(2):
        for row in range(rows):
            for col in range(sides):
                phi = col * 2 * math.pi / sides
                front = max(0, -math.sin(phi))
                edge = 1.96 - .78 * front + front ** 4 * (.10 * math.sin(phi * 3 + .8) + .06 * math.sin(phi * 5))
                theta = .025 + (edge - .025) * row / (rows - 1)
                shell = 1 if layer == 0 else .94
                vertices.append((.245 * shell * math.sin(theta) * math.cos(phi),
                                 .212 * shell * math.sin(theta) * math.sin(phi) + .008,
                                 1.575 + .25 * shell * math.cos(theta)))
        base = layer * rows * sides
        for row in range(rows - 1):
            for col in range(sides):
                a, b = base + row * sides + col, base + row * sides + (col + 1) % sides
                face = (a, b, b + sides, a + sides)
                faces.append(face if layer == 0 else tuple(reversed(face)))
        faces.append(tuple(base + col for col in (reversed(range(sides)) if layer == 0 else range(sides))))
    for col in range(sides):
        a, b = (rows - 1) * sides + col, (rows - 1) * sides + (col + 1) % sides
        faces.append((a, a + rows * sides, b + rows * sides, b))
    mesh = bpy.data.meshes.new('Short hair sculpt')
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new('ShortHair', mesh)
    bpy.context.collection.objects.link(obj)
    finish(obj, obj.name, paint)
    fringe = oval('Swept fringe volume', (-.055, -.163, 1.695), (.150, .060, .068), paint)
    fringe.rotation_euler.y = -.27
    return joined('ShortHair', [obj, fringe], paint, .007)


def torso(paint):
    """One tailored shoulder/waist profile, without stacked spherical lobes."""
    rings = [(.755, .177, .105), (.79, .190, .116), (.90, .181, .112),
             (1.04, .190, .119), (1.15, .208, .126), (1.22, .195, .112),
             (1.265, .154, .087), (1.29, .078, .066)]
    vertices, faces, sides = [], [], 32
    for row, (z, width, depth) in enumerate(rings):
        for col in range(sides):
            angle = 2 * math.pi * col / sides
            vertices.append((width * math.cos(angle), depth * math.sin(angle), z))
        if row:
            for col in range(sides):
                a, b = (row - 1) * sides + col, (row - 1) * sides + (col + 1) % sides
                faces.append((a, b, b + sides, a + sides))
    faces.extend([tuple(reversed(range(sides))), tuple(range((len(rings) - 1) * sides, len(rings) * sides))])
    mesh = bpy.data.meshes.new('Tailored torso')
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new('Torso volume', mesh)
    bpy.context.collection.objects.link(obj)
    return finish(obj, obj.name, paint)


def create_surfaces(paints):
    knit, pants, skin = (paints[key] for key in ('outfit', 'trouser', 'skin'))
    sweater = [torso(knit)]
    bpy.ops.mesh.primitive_torus_add(major_radius=.073, minor_radius=.012, major_segments=32, minor_segments=10, location=(0, 0, 1.287))
    sweater.append(finish(bpy.context.object, 'Fitted knit neckline', knit))
    trousers = [oval('Hip volume', (0, .015, .82), (.18, .12, .12), pants)]
    result = []
    for sign, side in ((-1, 'L'), (1, 'R')):
        shoulder, elbow, wrist = (Vector(v) for v in ((sign * .185, 0, 1.22), (sign * .34, 0, 1.06), (sign * .425, -.015, .865)))
        sweater.extend([tube('Sleeve volume', [shoulder, shoulder.lerp(elbow, .5), elbow, elbow.lerp(wrist, .55), wrist], [.072, .069, .063, .059, .051], knit),
                        oval('Shoulder volume', shoulder, (.078, .074, .072), knit)])
        hand_end = wrist + Vector((sign * .022, -.012, -.07))
        palm = oval('Palm volume', hand_end, (.042, .032, .053), skin)
        thumb = oval('Thumb volume', hand_end + Vector((-sign * .028, -.009, .018)), (.019, .022, .028), skin)
        result.append((joined('Hand' + side, [palm, thumb], skin, .007), 'hand', side))
        trousers.append(tube('Trouser volume', [(sign * .105, .01, .86), (sign * .105, 0, .70), (sign * .105, 0, .56), (sign * .105, 0, .35), (sign * .105, 0, .115)], [.084, .079, .067, .061, .054], pants))
        result.extend([(oval('Shoe' + side, (sign * .105, -.052, .064), (.078, .137, .055), paints['shoeColor']), 'rigid', 'Foot' + side),
                       (oval('Sole' + side, (sign * .105, -.050, .028), (.081, .14, .028), paints['sole']), 'rigid', 'Foot' + side)])
    result.extend([(joined('Sweater', sweater, knit), 'sweater', None),
                   (joined('Trousers', trousers, pants), 'trousers', None)])
    head = oval('Head volume', (0, -.003, 1.575), (.231, .184, .231), skin)
    for vertex in head.data.vertices:
        if vertex.co.z < -.035:
            vertex.co.x *= 1 - .20 * min(1, (-vertex.co.z - .035) / .19)
    skin_parts = [head, oval('Neck volume', (0, 0, 1.335), (.068, .065, .115), skin)]
    for sign in (-1, 1):
        skin_parts.append(oval('Ear volume', (sign * .227, 0, 1.56), (.037, .036, .057), skin))
    result.append((joined('Skin', skin_parts, skin, .009), 'skin', None))
    result.append((hair(paints['hairColor']), 'rigid', 'Head'))
    for sign in (-1, 1):
        side = 'L' if sign < 0 else 'R'
        result.append((oval('Eye' + side, (sign * .087, -.175, 1.568), (.017, .014, .023), paints['eyeColor']), 'rigid', 'Eye' + side))
    result.append((oval('Nose', (0, -.185, 1.538), (.015, .019, .017), skin), 'rigid', 'Head'))
    result.append((tube('Smile', [(-.026, -.178, 1.503), (0, -.181, 1.495), (.026, -.178, 1.503)], [.004, .004, .004], paints['mouth']), 'rigid', 'Head'))
    return result
