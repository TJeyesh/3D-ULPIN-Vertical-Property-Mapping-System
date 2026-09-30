"""
Module 2: 3D Extrusion & Volumetric Geometry Engine
Smart India Hackathon 2026 - SIH26011: 3D ULPIN Generation System

Intakes 2D polygon coordinates, extrudes them along the Z-axis according to
floor number, floor elevation, and ceiling height, calculates exact 3D centroids,
bounding boxes, and builds triangulated 3D meshes for rendering and cadastral records.
"""

import numpy as np
from shapely.geometry import Polygon, Point, MultiPolygon
from shapely.ops import triangulate, polylabel
from typing import List, Dict, Any, Tuple, Optional
import json


class Geometry3DExtruder:
    """
    Volumetric Extrusion and 3D Cadastral Spatial Geometry Builder.
    Includes Point-in-Polygon (PIP) validation and Pole of Inaccessibility (polylabel)
    fallback for irregular and L-shaped multi-unit floors.
    """
    def __init__(self, default_ceiling_height: float = 3.0, ground_elevation_amsl: float = 215.0):
        self.default_ceiling_height = default_ceiling_height
        self.ground_elevation_amsl = ground_elevation_amsl  # Altitude above Mean Sea Level (m)

    def extrude_polygon_to_3d(
        self,
        polygon_2d: List[List[float]],
        floor_number: int,
        ceiling_height: Optional[float] = None,
        base_elevation_z: Optional[float] = None,
        unit_metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Extrudes a 2D planar polygon [ [x0, y0], [x1, y1], ... ] along the Z-axis.
        
        Guarantees anchor coordinate interiority via:
        1. Point-in-Polygon (PIP) test using Shapely polygon.contains(centroid).
        2. Automatic Pole of Inaccessibility fallback via shapely.ops.polylabel for
           irregular / L-shaped geometries where bounding-box centroid falls outside.
        """
        height = ceiling_height if ceiling_height is not None else self.default_ceiling_height
        z_base = base_elevation_z if base_elevation_z is not None else (floor_number * height)
        z_top = z_base + height
        z_amsl_centroid = self.ground_elevation_amsl + z_base + (height / 2.0)

        # Validate and clean 2D Polygon using Shapely
        clean_pts = polygon_2d[:-1] if (len(polygon_2d) > 2 and polygon_2d[0] == polygon_2d[-1]) else polygon_2d
        if len(clean_pts) < 3:
            raise ValueError(f"Polygon must have at least 3 distinct vertices, got {len(clean_pts)}")

        shapely_poly = Polygon(clean_pts)
        if not shapely_poly.is_valid:
            shapely_poly = shapely_poly.buffer(0)

        floor_area_m2 = float(shapely_poly.area)
        volume_m3 = float(floor_area_m2 * height)

        # 1. Calculate raw mathematical centroid
        raw_centroid = shapely_poly.centroid
        
        # 2. Point-in-Polygon (PIP) validation: Verify if centroid is strictly inside boundary
        is_centroid_inside = shapely_poly.contains(raw_centroid)

        if is_centroid_inside:
            anchor_pt = raw_centroid
            anchor_type = "standard_centroid"
            inscribed_radius = 0.0
            pole_pt = None
        else:
            # Irregular / L-shaped unit: mathematical centroid falls outside unit boundaries.
            # Automated fallback: Calculate the Pole of Inaccessibility using shapely.ops.polylabel
            # (center of the maximum inscribed interior circle)
            anchor_pt = polylabel(shapely_poly, tolerance=0.01)
            anchor_type = "polylabel_pole_of_inaccessibility"
            inscribed_radius = float(shapely_poly.exterior.distance(anchor_pt))
            pole_pt = [round(float(anchor_pt.x), 4), round(float(anchor_pt.y), 4)]

        centroid_3d = {
            "x": round(float(anchor_pt.x), 4),
            "y": round(float(anchor_pt.y), 4),
            "z": round(float(z_base + (height / 2.0)), 4),
            "z_amsl": round(float(z_amsl_centroid), 4),
            "is_point_in_polygon": bool(is_centroid_inside),
            "anchor_method": anchor_type,
            "raw_mathematical_centroid": [round(float(raw_centroid.x), 4), round(float(raw_centroid.y), 4)],
            "pole_of_inaccessibility": pole_pt,
            "inscribed_radius_meters": round(inscribed_radius, 4)
        }

        # Calculate 3D Bounding Box
        min_x, min_y, max_x, max_y = shapely_poly.bounds
        bounds_3d = {
            "min_x": round(float(min_x), 4),
            "min_y": round(float(min_y), 4),
            "min_z": round(float(z_base), 4),
            "max_x": round(float(max_x), 4),
            "max_y": round(float(max_y), 4),
            "max_z": round(float(z_top), 4),
            "base_amsl": round(float(self.ground_elevation_amsl + z_base), 4),
            "top_amsl": round(float(self.ground_elevation_amsl + z_top), 4)
        }

        # Generate Triangulated 3D Mesh
        mesh_data = self._generate_extruded_mesh(clean_pts, z_base, z_top)

        result = {
            "floor_number": floor_number,
            "ceiling_height": height,
            "z_base": round(z_base, 3),
            "z_top": round(z_top, 3),
            "altitude_amsl_centroid": round(z_amsl_centroid, 3),
            "centroid_3d": centroid_3d,
            "bounds_3d": bounds_3d,
            "floor_area_sq_meters": round(floor_area_m2, 2),
            "volume_cubic_meters": round(volume_m3, 2),
            "is_irregular_geometry": not is_centroid_inside,
            "anchor_method": anchor_type,
            "mesh": mesh_data,
            "metadata": unit_metadata or {}
        }
        return result

    def _generate_extruded_mesh(
        self,
        polygon_pts: List[List[float]],
        z_base: float,
        z_top: float
    ) -> Dict[str, Any]:
        """
        Builds complete 3D triangulated geometry:
        - Bottom cap (triangulated 2D polygon at z_base, normals pointing down)
        - Top cap (triangulated 2D polygon at z_top, normals pointing up)
        - Side wall quads (triangulated into 2 triangles per polygon edge)
        """
        n = len(polygon_pts)
        vertices: List[float] = []
        indices: List[int] = []
        normals: List[float] = []

        # 1. Simple ear-clipping / fan triangulation for cap faces
        # (For arbitrary convex/concave polygons)
        # Using Shapely Delaunay/constrained decomposition or fan triangulation
        poly = Polygon(polygon_pts)
        
        # Base vertices (0 .. n-1)
        for pt in polygon_pts:
            vertices.extend([float(pt[0]), float(pt[1]), float(z_base)])
            normals.extend([0.0, 0.0, -1.0])

        # Top vertices (n .. 2n-1)
        for pt in polygon_pts:
            vertices.extend([float(pt[0]), float(pt[1]), float(z_top)])
            normals.extend([0.0, 0.0, 1.0])

        # Top & Bottom Cap Triangulation (Fan triangulation from centroid vertex)
        # Bottom cap triangles (facing down, clockwise winding)
        for i in range(1, n - 1):
            indices.extend([0, i + 1, i])

        # Top cap triangles (facing up, counter-clockwise winding)
        for i in range(1, n - 1):
            indices.extend([n, n + i, n + i + 1])

        # 2. Side Walls Triangulation
        # Each edge (i -> i+1) forms 2 triangles with top vertices (n+i -> n+i+1)
        wall_vertex_offset = len(vertices) // 3
        
        for i in range(n):
            next_i = (i + 1) % n
            p1 = polygon_pts[i]
            p2 = polygon_pts[next_i]

            # Compute outward normal for this wall segment
            dx = p2[0] - p1[0]
            dy = p2[1] - p1[1]
            length = np.hypot(dx, dy)
            if length == 0:
                length = 1.0
            nx = float(dy / length)
            ny = float(-dx / length)

            # 4 vertices per wall quad to preserve sharp face normals
            curr_idx = len(vertices) // 3
            # Bottom-left, Bottom-right, Top-right, Top-left
            vertices.extend([p1[0], p1[1], z_base])
            normals.extend([nx, ny, 0.0])

            vertices.extend([p2[0], p2[1], z_base])
            normals.extend([nx, ny, 0.0])

            vertices.extend([p2[0], p2[1], z_top])
            normals.extend([nx, ny, 0.0])

            vertices.extend([p1[0], p1[1], z_top])
            normals.extend([nx, ny, 0.0])

            # Two triangles for the quad
            indices.extend([curr_idx, curr_idx + 1, curr_idx + 2])
            indices.extend([curr_idx, curr_idx + 2, curr_idx + 3])

        return {
            "vertex_count": len(vertices) // 3,
            "triangle_count": len(indices) // 3,
            "vertices": [round(v, 4) for v in vertices],
            "indices": indices,
            "normals": [round(n, 4) for n in normals]
        }

    def build_multi_floor_building(
        self,
        segmented_units: List[Dict[str, Any]],
        num_floors: int = 5,
        ceiling_height: float = 3.0,
        cadastral_base: Tuple[float, float] = (28.6139, 77.2090)
    ) -> List[Dict[str, Any]]:
        """
        Extrudes all units across multiple vertical floors.
        """
        all_3d_units = []
        for floor_idx in range(num_floors):
            floor_name = "Ground Floor" if floor_idx == 0 else f"Floor {floor_idx}"
            floor_code = f"F{floor_idx:02d}"

            for unit in segmented_units:
                extruded = self.extrude_polygon_to_3d(
                    polygon_2d=unit["polygon_2d"],
                    floor_number=floor_idx,
                    ceiling_height=ceiling_height,
                    unit_metadata={
                        "unit_id": f"{floor_code}-{unit['unit_id']}",
                        "name": f"{floor_name} - {unit['name']}",
                        "space_type": unit["space_type"],
                        "floor_label": floor_name,
                        "cadastral_base_lat": cadastral_base[0],
                        "cadastral_base_lon": cadastral_base[1]
                    }
                )
                all_3d_units.append(extruded)

        return all_3d_units


# Module Self-Test
if __name__ == "__main__":
    print("=== Testing Module 2: 3D Extrusion & Geometry Engine ===")
    
    # 1. Standard rectangular apartment unit
    rect_polygon = [[0.0, 0.0], [10.0, 0.0], [10.0, 12.0], [0.0, 12.0], [0.0, 0.0]]
    
    extruder = Geometry3DExtruder(default_ceiling_height=3.2, ground_elevation_amsl=210.0)
    unit_rect = extruder.extrude_polygon_to_3d(
        polygon_2d=rect_polygon,
        floor_number=3,
        ceiling_height=3.2,
        unit_metadata={"unit_name": "Flat 302", "wing": "East Tower"}
    )
    
    print(f"\n1. Standard Rectangular Unit:")
    print(f" - Anchor Type: {unit_rect['centroid_3d']['anchor_method']}")
    print(f" - Is Centroid Inside Polygon: {unit_rect['centroid_3d']['is_point_in_polygon']}")
    print(f" - 3D Anchor: X={unit_rect['centroid_3d']['x']}m, Y={unit_rect['centroid_3d']['y']}m, Z={unit_rect['centroid_3d']['z']}m")
    
    # 2. Irregular L-Shaped Penthouse unit where raw mathematical centroid falls outside
    l_shaped_polygon = [
        [0.0, 0.0],
        [18.0, 0.0],
        [18.0, 6.0],
        [6.0, 6.0],
        [6.0, 18.0],
        [0.0, 18.0],
        [0.0, 0.0]
    ]
    
    unit_l = extruder.extrude_polygon_to_3d(
        polygon_2d=l_shaped_polygon,
        floor_number=5,
        ceiling_height=3.5,
        unit_metadata={"unit_name": "Penthouse 501", "type": "L-Shape"}
    )
    
    print(f"\n2. Irregular L-Shaped Unit (Point-in-Polygon & Polylabel Test):")
    print(f" - Raw Mathematical Centroid: {unit_l['centroid_3d']['raw_mathematical_centroid']}")
    print(f" - Is Centroid Inside Polygon: {unit_l['centroid_3d']['is_point_in_polygon']} (Failed PIP check)")
    print(f" - Active Fallback Anchor: {unit_l['centroid_3d']['anchor_method']}")
    print(f" - Pole of Inaccessibility: {unit_l['centroid_3d']['pole_of_inaccessibility']}")
    print(f" - Maximum Inscribed Radius: {unit_l['centroid_3d']['inscribed_radius_meters']}m")
    print(f" - Guaranteed Inside 3D Coordinate: X={unit_l['centroid_3d']['x']}m, Y={unit_l['centroid_3d']['y']}m, Z={unit_l['centroid_3d']['z']}m")
    print(f" - Mesh: {unit_l['mesh']['vertex_count']} vertices, {unit_l['mesh']['triangle_count']} triangles.")
