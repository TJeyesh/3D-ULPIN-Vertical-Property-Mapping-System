"""
FastAPI Server for 3D ULPIN Generation and Vertical Property Mapping System
Smart India Hackathon 2026 - Problem Statement SIH26011
Ministry of Rural Development & Department of Land Resources (DoLR)

Endpoints:
1. GET  /api/health            - Health check & system status
2. POST /api/process-floorplan - End-to-end AI segmentation + 3D extrusion + ULPIN generation
3. POST /api/verify-ulpin      - 14-digit 3D ULPIN Luhn Mod-36 validation and structural decoding
4. POST /api/extrude-cadastre  - Direct polygon 3D extrusion with Point-in-Polygon validation
"""

import os
import io
import base64
import numpy as np
from PIL import Image
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Internal Pipeline Modules
from segmentation_engine import FloorplanSegmentationEngine
from geometry_builder import Geometry3DExtruder
from ulpin_generator import VerticalULPINGenerator

app = FastAPI(
    title="3D ULPIN & Vertical Cadastre API (SIH26011)",
    description="Production API for AI Floorplan Segmentation, 3D Volumetric Extrusion, and 14-Digit 3D Bhu-Aadhaar Generation.",
    version="2.0.0"
)

# Enable CORS for browser frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Core Processing Engines
segmentation_engine = FloorplanSegmentationEngine()
ulpin_generator = VerticalULPINGenerator()


# -------------------------------------------------------------
# Pydantic Request & Response Schemas
# -------------------------------------------------------------
class VerifyUlpinRequest(BaseModel):
    ulpin: str = Field(..., description="14-digit 3D ULPIN string (e.g. 77KA8B91F03U2K or formatted)")

class ExtrudePolygonRequest(BaseModel):
    latitude: float = Field(default=28.6139, description="Plot Latitude (WGS84)")
    longitude: float = Field(default=77.2090, description="Plot Longitude (WGS84)")
    ground_elevation_amsl: float = Field(default=215.0, description="Ground elevation AMSL in meters")
    ceiling_height_per_floor: float = Field(default=3.0, description="Floor height in meters")
    total_floors: int = Field(default=4, description="Total floors count")
    polygons: List[Dict[str, Any]] = Field(..., description="List of 2D unit polygons")


# -------------------------------------------------------------
# API Endpoints
# -------------------------------------------------------------
@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "service": "3D ULPIN Generation Engine (SIH26011)",
        "version": "2.0.0",
        "features": [
            "PyTorch U-Net Architectural Segmentation",
            "OpenCV Bilateral + Otsu Morphological Contours",
            "Shapely Point-in-Polygon (PIP) Validation",
            "Pole of Inaccessibility (shapely.ops.polylabel) Fallback",
            "14-Digit Luhn Mod-36 Cryptographic Checksum ULPINs",
            "WebGL / Three.js 3D Cadastral Digital Twin Integration"
        ]
    }


@app.post("/api/verify-ulpin")
def verify_and_decode_ulpin(req: VerifyUlpinRequest):
    """
    Validates and decodes any 14-digit 3D ULPIN string into its constituent cadastral components.
    """
    result = ulpin_generator.decode_ulpin(req.ulpin)
    return result


@app.post("/api/process-floorplan")
async def process_floorplan(
    file: Optional[UploadFile] = File(None),
    latitude: float = Form(28.613939),
    longitude: float = Form(77.209021),
    total_floors: int = Form(4),
    ceiling_height: float = Form(3.0),
    ground_elevation_amsl: float = Form(215.0),
    pixel_scale: float = Form(0.05),
    district: str = Form("New Delhi Central"),
    state: str = Form("Delhi")
):
    """
    End-to-end pipeline:
    1. Ingests architectural floorplan image (PNG/JPG).
    2. Runs AI Segmentation and Douglas-Peucker contour simplification.
    3. Executes 3D Extrusion with Point-in-Polygon and Polylabel checks.
    4. Computes 14-digit 3D ULPINs with Mod-36 checksums.
    5. Returns unified 3D Cadastral JSON payload for Three.js rendering.
    """
    try:
        if file:
            contents = await file.read()
            image = Image.open(io.BytesIO(contents)).convert("RGB")
            img_np = np.array(image)
        else:
            # Generate synthetic floorplan if none uploaded
            img_np = np.ones((500, 500, 3), dtype=np.uint8) * 255
            import cv2
            cv2.rectangle(img_np, (30, 30), (470, 470), (0, 0, 0), thickness=10)
            cv2.line(img_np, (250, 30), (250, 470), (0, 0, 0), thickness=8)
            cv2.line(img_np, (30, 260), (470, 260), (0, 0, 0), thickness=8)

        # 1. AI Segmentation Engine
        units_2d = segmentation_engine.extract_room_polygons(
            image_path_or_array=img_np,
            pixel_to_meter_scale=pixel_scale
        )

        # 2. 3D Volumetric Extruder
        extruder = Geometry3DExtruder(
            default_ceiling_height=ceiling_height,
            ground_elevation_amsl=ground_elevation_amsl
        )

        all_cadastral_units = []
        unit_counter = 1

        for floor in range(total_floors):
            floor_label = "Ground Floor" if floor == 0 else f"Floor {floor}"
            for u2d in units_2d:
                poly = u2d["polygon_2d"]
                extruded = extruder.extrude_polygon_to_3d(
                    polygon_2d=poly,
                    floor_number=floor,
                    ceiling_height=ceiling_height,
                    unit_metadata={
                        "unit_name": f"{u2d['name']} ({floor_label})",
                        "space_type": u2d["space_type"]
                    }
                )

                # 3. 14-Digit 3D ULPIN
                ulpin_res = ulpin_generator.generate_3d_ulpin(
                    base_latitude=latitude,
                    base_longitude=longitude,
                    floor_number=floor,
                    centroid_3d=extruded["centroid_3d"],
                    altitude_amsl=extruded["altitude_amsl_centroid"],
                    unit_index=unit_counter
                )

                all_cadastral_units.append({
                    "id": f"plot-f{floor}-u{unit_counter}",
                    "unit_id": u2d["unit_id"],
                    "unit_number": unit_counter,
                    "floor_number": floor,
                    "floor_label": floor_label,
                    "name": f"{u2d['name']} (Unit {unit_counter:02d})",
                    "space_type": u2d["space_type"],
                    "ulpin_14": ulpin_res["ulpin_14"],
                    "formatted_ulpin": ulpin_res["formatted_ulpin"],
                    "is_ulpin_valid": ulpin_res["is_valid"],
                    "ulpin_breakdown": ulpin_res["breakdown"],
                    "floor_area_sq_meters": extruded["floor_area_sq_meters"],
                    "volume_cubic_meters": extruded["volume_cubic_meters"],
                    "ceiling_height_meters": ceiling_height,
                    "altitude_amsl_centroid": extruded["altitude_amsl_centroid"],
                    "z_base": extruded["z_base"],
                    "z_top": extruded["z_top"],
                    "centroid_3d": extruded["centroid_3d"],
                    "bounds_3d": extruded["bounds_3d"],
                    "mesh": extruded["mesh"],
                    "polygon_2d": poly,
                    "is_irregular_geometry": extruded["is_irregular_geometry"],
                    "anchor_method": extruded["anchor_method"]
                })
                unit_counter += 1

        return {
            "success": True,
            "plot_metadata": {
                "latitude": latitude,
                "longitude": longitude,
                "district": district,
                "state": state,
                "total_floors": total_floors,
                "ground_elevation_amsl": ground_elevation_amsl,
                "ceiling_height": ceiling_height,
                "total_units_generated": len(all_cadastral_units)
            },
            "units_2d_count": len(units_2d),
            "units_3d": all_cadastral_units
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/extrude-cadastre")
def extrude_cadastre_from_polygons(req: ExtrudePolygonRequest):
    """
    Directly extrudes supplied 2D polygons across multi-floor tiers without requiring raster upload.
    """
    extruder = Geometry3DExtruder(
        default_ceiling_height=req.ceiling_height_per_floor,
        ground_elevation_amsl=req.ground_elevation_amsl
    )

    cadastral_units = []
    unit_idx = 1

    for floor in range(req.total_floors):
        floor_label = "Ground Floor" if floor == 0 else f"Floor {floor}"
        for poly_info in req.polygons:
            poly_pts = poly_info.get("polygon", [])
            name = poly_info.get("name", f"Unit {unit_idx}")
            space_type = poly_info.get("space_type", "Apartment")

            extruded = extruder.extrude_polygon_to_3d(
                polygon_2d=poly_pts,
                floor_number=floor,
                ceiling_height=req.ceiling_height_per_floor,
                unit_metadata={"name": name, "space_type": space_type}
            )

            ulpin_res = ulpin_generator.generate_3d_ulpin(
                base_latitude=req.latitude,
                base_longitude=req.longitude,
                floor_number=floor,
                centroid_3d=extruded["centroid_3d"],
                altitude_amsl=extruded["altitude_amsl_centroid"],
                unit_index=unit_idx
            )

            cadastral_units.append({
                "id": f"unit-{floor}-{unit_idx}",
                "unit_number": unit_idx,
                "floor_number": floor,
                "floor_label": floor_label,
                "name": name,
                "space_type": space_type,
                "ulpin_14": ulpin_res["ulpin_14"],
                "formatted_ulpin": ulpin_res["formatted_ulpin"],
                "is_ulpin_valid": ulpin_res["is_valid"],
                "floor_area_sq_meters": extruded["floor_area_sq_meters"],
                "volume_cubic_meters": extruded["volume_cubic_meters"],
                "centroid_3d": extruded["centroid_3d"],
                "bounds_3d": extruded["bounds_3d"],
                "mesh": extruded["mesh"],
                "polygon_2d": poly_pts,
                "anchor_method": extruded["anchor_method"]
            })
            unit_idx += 1

    return {
        "success": True,
        "total_units": len(cadastral_units),
        "units": cadastral_units
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
