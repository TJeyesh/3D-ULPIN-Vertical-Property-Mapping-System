export interface Point2D {
  x: number;
  y: number;
}

export interface Centroid3D {
  x: number;
  y: number;
  z: number;
  zAmsl?: number;
  isPointInPolygon?: boolean;
  anchorType?: 'centroid' | 'polylabel_pole_of_inaccessibility';
  rawMathematicalCentroid?: { x: number; y: number };
  poleOfInaccessibility?: { x: number; y: number };
  inscribedRadius?: number;
}

export interface Bounds3D {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
  baseAmsl?: number;
  topAmsl?: number;
}

export interface MeshData {
  vertexCount: number;
  triangleCount: number;
  vertices: number[];
  indices: number[];
  normals: number[];
}

export interface ULPINBreakdown {
  baseCadastralGeocode: string; // 8 characters
  verticalFloorTier: string;    // 3 characters (e.g., F03, G00, B01)
  subunitVoxelHash: string;     // 2 characters (e.g., U1, U2, AB)
  mod36Checksum: string;        // 1 character (Luhn Mod-36)
  floorNumber: number;
  altitudeAmslMeters: number;
  centroid3D: Centroid3D;
  anchorType?: 'centroid' | 'polylabel_pole_of_inaccessibility';
}

export interface CadastralUnit {
  unitId: string;
  unitName: string;
  spaceType: string;
  floorNumber: number;
  floorLabel: string;
  ulpin14: string;
  formattedUlpin: string;
  isUlpinValid: boolean;
  ulpinBreakdown: ULPINBreakdown;
  floorAreaSqMeters: number;
  volumeCubicMeters: number;
  ceilingHeightMeters: number;
  zBase: number;
  zTop: number;
  altitudeAmslCentroid: number;
  centroid3D: Centroid3D;
  bounds3D: Bounds3D;
  polygon2D: [number, number][];
  mesh: MeshData;
  color?: string;
  ownerName?: string;
  propertyTaxId?: string;
  isIrregularShape?: boolean;
  anchorMethod?: 'standard_centroid' | 'polylabel_pole_of_inaccessibility';
}

export interface CadastralPlot {
  surveyPlotNo: string;
  villageOrSector: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  groundElevationAmsl: number;
  totalFloors: number;
  ceilingHeightPerFloor: number;
  totalVerticalUnits: number;
  buildingName: string;
}

export interface FloorplanPreset {
  id: string;
  name: string;
  description: string;
  category: string;
  unitCount: number;
  totalAreaSqM: number;
  imageUrl?: string;
  units: {
    name: string;
    spaceType: string;
    polygon: [number, number][];
  }[];
}
