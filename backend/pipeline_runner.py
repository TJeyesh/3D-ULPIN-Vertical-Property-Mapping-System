"""
End-to-End Orchestration Pipeline & Cadastral 3D Bridge
Smart India Hackathon 2026 - SIH26011: 3D ULPIN Generation System

Runs the complete workflow:
1. Ingests 2D floor plan image.
2. Extracts room & apartment polygon vectors via AI segmentation.
3. Extrudes 2D geometries along the Z-axis for multiple floors.
4. Generates deterministic 14-digit 3D ULPINs (3D Bhu-Aadhaar) for every volumetric unit.
5. Exports production JSON and 3D OBJ mesh file ready for SceneKit & WebGL visualizers.
"""

import argparse
import json
import os
import sys
import numpy as np
import cv2

# Import project modules
from segmentation_engine import FloorplanSegmentationEngine
from geometry_builder import Geometry3DExtruder
from ulpin_generator import VerticalULPINGenerator


def run_full_pipeline(
    image_path: str,
    num_floors: int = 5,
    ceiling_height: float = 3.2,
    base_latitude: float = 28.613939,
    base_longitude: float = 77.209021,
    ground_amsl_elevation: float = 215.0,
    output_dir: str = "./output"
) -> dict:
    """
    Executes full SIH26011 automated pipeline.
    """
    os.makedirs(output_dir, exist_ok=True)
    print(f"[*] Initializing SIH26011 3D ULPIN Pipeline...")
    print(f"[*] Target Cadastral Plot: ({base_latitude}, {base_longitude}) | Floors: {num_floors} | Ceiling: {ceiling_height}m")

    # Step 1: AI Segmentation
    print("\n[Step 1/4] Running AI Segmentation on 2D floor plan...")
    seg_engine = FloorplanSegmentationEngine()
    
    if not os.path.exists(image_path):
        print(f"[!] Image not found at {image_path}. Generating synthetic test cadastral floor plan...")
        test_img = np.ones((600, 600, 3), dtype=np.uint8) * 255
        cv2.rectangle(test_img, (40, 40), (560, 560), (0, 0, 0), thickness=10)
        cv2.line(test_img, (300, 40), (300, 560), (0, 0, 0), thickness=8)
        cv2.line(test_img, (40, 300), (560, 300), (0, 0, 0), thickness=8)
        image_path = os.path.join(output_dir, "sample_floorplan_generated.png")
        cv2.imwrite(image_path, test_img)
        print(f"[+] Saved synthetic floorplan to {image_path}")

    extracted_polygons = seg_engine.extract_room_polygons(
        image_path_or_array=image_path,
        pixel_to_meter_scale=0.035,
        min_area_sq_meters=4.0
    )
    print(f"[+] Extracted {len(extracted_polygons)} 2D unit footprint polygons.")

    # Step 2: 3D Volumetric Extrusion
    print("\n[Step 2/4] Extruding 2D geometries across vertical floor tiers...")
    extruder = Geometry3DExtruder(
        default_ceiling_height=ceiling_height,
        ground_elevation_amsl=ground_amsl_elevation
    )
    
    # Step 3: Deterministic 3D ULPIN Generation
    print("\n[Step 3/4] Generating 14-Digit 3D ULPINs (3D Bhu-Aadhaar)...")
    ulpin_gen = VerticalULPINGenerator()
    
    building_units = []
    global_unit_counter = 1

    for floor_idx in range(num_floors):
        floor_label = "Ground Floor" if floor_idx == 0 else f"Floor {floor_idx}"
        
        for unit_sub_idx, poly_info in enumerate(extracted_polygons, start=1):
            # Extrude unit
            extruded = extruder.extrude_polygon_to_3d(
                polygon_2d=poly_info["polygon_2d"],
                floor_number=floor_idx,
                ceiling_height=ceiling_height
            )
            
            # Generate 3D ULPIN
            ulpin_data = ulpin_gen.generate_3d_ulpin(
                base_latitude=base_latitude,
                base_longitude=base_longitude,
                floor_number=floor_idx,
                centroid_3d=extruded["centroid_3d"],
                altitude_amsl=extruded["altitude_amsl_centroid"],
                unit_index=unit_sub_idx
            )
            
            unit_record = {
                "unit_id": f"FL{floor_idx:02d}-U{unit_sub_idx:02d}",
                "unit_name": f"{floor_label} {poly_info['name']}",
                "space_type": poly_info["space_type"],
                "floor_number": floor_idx,
                "floor_label": floor_label,
                "ulpin_14": ulpin_data["ulpin_14"],
                "formatted_ulpin": ulpin_data["formatted_ulpin"],
                "is_ulpin_valid": ulpin_data["is_valid"],
                "ulpin_breakdown": ulpin_data["breakdown"],
                "floor_area_sq_meters": extruded["floor_area_sq_meters"],
                "volume_cubic_meters": extruded["volume_cubic_meters"],
                "ceiling_height_meters": ceiling_height,
                "z_base": extruded["z_base"],
                "z_top": extruded["z_top"],
                "altitude_amsl_centroid": extruded["altitude_amsl_centroid"],
                "centroid_3d": extruded["centroid_3d"],
                "bounds_3d": extruded["bounds_3d"],
                "polygon_2d": poly_info["polygon_2d"],
                "mesh": extruded["mesh"]
            }
            
            building_units.append(unit_record)
            global_unit_counter += 1

    # Step 4: Export Deliverables
    print("\n[Step 4/4] Exporting Cadastral 3D Model and JSON database...")
    cadastre_payload = {
        "project": "SIH26011 - 3D ULPIN and Vertical Property Mapping System",
        "ministry": "Ministry of Rural Development / Dept of Land Resources",
        "cadastral_plot": {
            "survey_plot_no": "KA-BLR-2026-789",
            "latitude": base_latitude,
            "longitude": base_longitude,
            "ground_elevation_amsl": ground_amsl_elevation,
            "total_floors": num_floors,
            "ceiling_height_per_floor": ceiling_height,
            "total_vertical_units": len(building_units)
        },
        "units": building_units
    }

    json_path = os.path.join(output_dir, "building_cadastre_3d.json")
    with open(json_path, "w") as f:
        json.dump(cadastre_payload, f, indent=2)
    print(f"[+] Saved 3D Cadastral JSON dataset: {json_path}")

    # Export Wavefront OBJ mesh file for 3D renderers
    obj_path = os.path.join(output_dir, "building_cadastre_mesh.obj")
    export_combined_obj(building_units, obj_path)
    print(f"[+] Saved 3D Wavefront Mesh: {obj_path}")

    print("\n=======================================================")
    print(f"[✓] Pipeline complete! Generated {len(building_units)} 3D vertical units.")
    print(f"[✓] Sample 3D ULPIN: {building_units[0]['ulpin_14']} ({building_units[0]['formatted_ulpin']})")
    print("=======================================================\n")

    return cadastre_payload


def export_combined_obj(units: list, filepath: str):
    """Exports all 3D units into standard Wavefront .OBJ format."""
    with open(filepath, "w") as f:
        f.write("# SIH26011 3D ULPIN Cadastral Digital Twin Mesh\n")
        f.write("# Ministry of Rural Development\n\n")
        
        vertex_offset = 1
        for unit in units:
            f.write(f"o {unit['unit_id']}_{unit['ulpin_14']}\n")
            mesh = unit["mesh"]
            v_arr = mesh["vertices"]
            for i in range(0, len(v_arr), 3):
                f.write(f"v {v_arr[i]} {v_arr[i+2]} {v_arr[i+1]}\n")  # Swap Y and Z for standard OBJ up-axis
            
            n_arr = mesh.get("normals", [])
            for i in range(0, len(n_arr), 3):
                f.write(f"vn {n_arr[i]} {n_arr[i+2]} {n_arr[i+1]}\n")

            indices = mesh["indices"]
            for i in range(0, len(indices), 3):
                idx0 = vertex_offset + indices[i]
                idx1 = vertex_offset + indices[i+1]
                idx2 = vertex_offset + indices[i+2]
                f.write(f"f {idx0}//{idx0} {idx1}//{idx1} {idx2}//{idx2}\n")

            vertex_offset += len(v_arr) // 3
            f.write("\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SIH26011: 3D ULPIN Generation Pipeline")
    parser.add_argument("--image", default="sample_floorplan.png", help="Path to 2D floor plan image")
    parser.add_argument("--floors", type=int, default=5, help="Number of vertical floors")
    parser.add_argument("--height", type=float, default=3.2, help="Ceiling height per floor (meters)")
    parser.add_argument("--lat", type=float, default=28.613939, help="Cadastral plot Latitude (WGS84)")
    parser.add_argument("--lon", type=float, default=77.209021, help="Cadastral plot Longitude (WGS84)")
    parser.add_argument("--amsl", type=float, default=215.0, help="Base Ground Altitude AMSL (meters)")
    parser.add_argument("--output", default="./output", help="Output directory")

    args = parser.parse_args()
    run_full_pipeline(
        image_path=args.image,
        num_floors=args.floors,
        ceiling_height=args.height,
        base_latitude=args.lat,
        base_longitude=args.lon,
        ground_amsl_elevation=args.amsl,
        output_dir=args.output
    )
