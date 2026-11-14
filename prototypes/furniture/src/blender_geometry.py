"""Closed Blender mesh helpers shared by the resident and pet pilots."""
import math

import bpy
from mathutils import Vector


def material(name, hex_color):
    value = bpy.data.materials.new(name)
    rgb = [int(hex_color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    linear = [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in rgb]
    value.diffuse_color = (*linear, 1)
    value.use_nodes = True
    shader = value.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*linear, 1)
    shader.inputs['Roughness'].default_value = .93
    return value


def finish(obj, name, paint):
    obj.name = name
    obj.data.name = name
    obj.data.materials.clear()
    obj.data.materials.append(paint)
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj


def oval(name, center, radii, paint):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=16, location=center)
    obj = bpy.context.object
    obj.scale = radii
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, paint)


def tube(name, points, radii, paint):
    """Loft one connected limb; joint rings remain part of the same surface."""
    vertices, faces, sides = [], [], 20
    for i, point in enumerate(points):
        direction = Vector(points[min(i + 1, len(points) - 1)]) - Vector(points[max(0, i - 1)])
        tangent = direction.normalized()
        across = tangent.cross(Vector((0, 1, 0))).normalized()
        depth = tangent.cross(across).normalized()
        for j in range(sides):
            angle = 2 * math.pi * j / sides
            vertices.append(Vector(point) + radii[i] * (math.cos(angle) * across + math.sin(angle) * depth))
        if i:
            for j in range(sides):
                a, b = (i - 1) * sides + j, (i - 1) * sides + (j + 1) % sides
                faces.append((a, b, b + sides, a + sides))
    faces.extend([tuple(reversed(range(sides))), tuple(range((len(points) - 1) * sides, len(points) * sides))])
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return finish(obj, name, paint)


def joined(name, pieces, paint, voxel=.012):
    """Fuse construction volumes before weighting; no receiving joint balls."""
    bpy.ops.object.select_all(action='DESELECT')
    for obj in pieces:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = pieces[0]
    bpy.ops.object.join()
    obj = bpy.context.object
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    remesh = obj.modifiers.new('Connected sculpt surface', 'REMESH')
    remesh.mode, remesh.voxel_size, remesh.use_smooth_shade = 'VOXEL', voxel, True
    bpy.ops.object.modifier_apply(modifier=remesh.name)
    smooth = obj.modifiers.new('Soft silhouette', 'SMOOTH')
    smooth.factor, smooth.iterations = .7, 4
    bpy.ops.object.modifier_apply(modifier=smooth.name)
    decimate = obj.modifiers.new('Room scale topology', 'DECIMATE')
    decimate.ratio = .55
    bpy.ops.object.modifier_apply(modifier=decimate.name)
    return finish(obj, name, paint)


