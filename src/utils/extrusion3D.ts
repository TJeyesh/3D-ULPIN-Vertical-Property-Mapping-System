import {
  CadastralPlot,
  CadastralUnit,
  Centroid3D,
  Bounds3D,
  MeshData,
  FloorplanPreset,
} from '../types/cadastre';
import { generate3DULPIN } from './ulpin';

const FLOOR_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
];

/**
 * Calculates 2D polygon centroid (mean of all vertices or weighted)
 */
export function calculatePolygonCentroid(pts: [number, number][]): { x: number; y: number } {
  const cleanPts = pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]
    ? pts.slice(0, -1)
    : pts;
  let cx = 0;
  let cy = 0;
  for (const pt of cleanPts) {
    cx += pt[0];
    cy += pt[1];
  }
  return {
    x: Number((cx / cleanPts.length).toFixed(4)),
    y: Number((cy / cleanPts.length).toFixed(4)),
  };
}

/**
 * Calculates 2D polygon area using Shoelace formula
 */
export function calculatePolygonArea(pts: [number, number][]): number {
  let area = 0;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += pts[i][0] * pts[j][1];
    area -= pts[j][0] * pts[i][1];
  }
  return Math.abs(area) / 2.0;
}

/**
 * Ray-casting algorithm to test if a 2D point is strictly inside a polygon boundary
 */
export function isPointInPolygon(point: { x: number; y: number }, pts: [number, number][]): boolean {
  const cleanPts = pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]
    ? pts.slice(0, -1)
    : pts;

  let inside = false;
  const n = cleanPts.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = cleanPts[i][0];
    const yi = cleanPts[i][1];
    const xj = cleanPts[j][0];
    const yj = cleanPts[j][1];

    const intersect = yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Calculates squared distance from a point p to a line segment [p1, p2]
 */
function getSeqSegmentDistanceSq(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  let dx = x2 - x1;
  let dy = y2 - y1;

  if (dx !== 0 || dy !== 0) {
    const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x1 = x2;
      y1 = y2;
    } else if (t > 0) {
      x1 += dx * t;
      y1 += dy * t;
    }
  }

  dx = px - x1;
  dy = py - y1;
  return dx * dx + dy * dy;
}

/**
 * Calculates signed distance from point (x, y) to polygon outline.
 * Positive = inside polygon, Negative = outside polygon.
 */
export function pointToPolygonSignedDistance(x: number, y: number, pts: [number, number][]): number {
  const cleanPts = pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]
    ? pts.slice(0, -1)
    : pts;

  const inside = isPointInPolygon({ x, y }, cleanPts);
  let minDistSq = Infinity;
  const n = cleanPts.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const dSq = getSeqSegmentDistanceSq(x, y, cleanPts[i][0], cleanPts[i][1], cleanPts[j][0], cleanPts[j][1]);
    if (dSq < minDistSq) minDistSq = dSq;
  }

  return (inside ? 1 : -1) * Math.sqrt(minDistSq);
}

/**
 * Quadtree Cell for Polylabel algorithm
 */
class Cell {
  x: number;
  y: number;
  h: number;
  d: number;
  max: number;

  constructor(x: number, y: number, h: number, pts: [number, number][]) {
    this.x = x; // cell center x
    this.y = y; // cell center y
    this.h = h; // half size
    this.d = pointToPolygonSignedDistance(x, y, pts); // distance to polygon from center
    this.max = this.d + this.h * Math.SQRT2; // max possible distance within this cell
  }
}

/**
 * Finds the Pole of Inaccessibility (center of maximum inscribed circle)
 * for irregular, concave, or L-shaped polygons to guarantee anchor points are inside.
 */
export function calculatePoleOfInaccessibility(
  polygonPts: [number, number][],
  precision = 0.05
): { x: number; y: number; distance: number } {
  const cleanPts = polygonPts[0][0] === polygonPts[polygonPts.length - 1][0] &&
                   polygonPts[0][1] === polygonPts[polygonPts.length - 1][1]
    ? polygonPts.slice(0, -1)
    : polygonPts;

  // Bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const pt of cleanPts) {
    if (pt[0] < minX) minX = pt[0];
    if (pt[1] < minY) minY = pt[1];
    if (pt[0] > maxX) maxX = pt[0];
    if (pt[1] > maxY) maxY = pt[1];
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const cellSize = Math.min(width, height);
  let h = cellSize / 2.0;

  if (cellSize === 0) {
    return { x: minX, y: minY, distance: 0 };
  }

  // Priority queue (simple array sorted by max descending)
  const cellQueue: Cell[] = [];

  for (let x = minX; x < maxX; x += cellSize) {
    for (let y = minY; y < maxY; y += cellSize) {
      cellQueue.push(new Cell(x + h, y + h, h, cleanPts));
    }
  }

  // Also include mathematical centroid as initial guess
  const centroid = calculatePolygonCentroid(cleanPts);
  let bestCell = new Cell(centroid.x, centroid.y, 0, cleanPts);

  // Bounding box centroid fallback
  const bboxCell = new Cell(minX + width / 2, minY + height / 2, 0, cleanPts);
  if (bboxCell.d > bestCell.d) bestCell = bboxCell;

  while (cellQueue.length) {
    // Sort descending by cell.max
    cellQueue.sort((a, b) => b.max - a.max);
    const cell = cellQueue.shift()!;

    if (cell.d > bestCell.d) {
      bestCell = cell;
    }

    // Do not split cell if it cannot produce a better result than bestCell
    if (cell.max - bestCell.d <= precision) continue;

    // Split into 4 sub-cells
    h = cell.h / 2.0;
    cellQueue.push(new Cell(cell.x - h, cell.y - h, h, cleanPts));
    cellQueue.push(new Cell(cell.x + h, cell.y - h, h, cleanPts));
    cellQueue.push(new Cell(cell.x - h, cell.y + h, h, cleanPts));
    cellQueue.push(new Cell(cell.x + h, cell.y + h, h, cleanPts));
  }

  return {
    x: Math.round(bestCell.x * 1000) / 1000,
    y: Math.round(bestCell.y * 1000) / 1000,
    distance: Math.max(0, Math.round(bestCell.d * 1000) / 1000),
  };
}

/**
 * Builds 3D Triangulated Mesh from 2D polygon coordinates and Z bounds
 */
export function buildExtrudedMesh(
  polygonPts: [number, number][],
  zBase: number,
  zTop: number
): MeshData {
  // Strip closing point if repeated
  const pts = polygonPts[0][0] === polygonPts[polygonPts.length - 1][0] &&
              polygonPts[0][1] === polygonPts[polygonPts.length - 1][1]
    ? polygonPts.slice(0, -1)
    : polygonPts;

  const n = pts.length;
  const vertices: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];

  // 1. Bottom Cap Vertices
  for (let i = 0; i < n; i++) {
    vertices.push(pts[i][0], pts[i][1], zBase);
    normals.push(0, 0, -1);
  }

  // 2. Top Cap Vertices
  for (let i = 0; i < n; i++) {
    vertices.push(pts[i][0], pts[i][1], zTop);
    normals.push(0, 0, 1);
  }

  // Triangulate Bottom Cap (Fan)
  for (let i = 1; i < n - 1; i++) {
    indices.push(0, i + 1, i);
  }

  // Triangulate Top Cap (Fan)
  for (let i = 1; i < n - 1; i++) {
    indices.push(n, n + i, n + i + 1);
  }

  // 3. Side Walls Quads
  for (let i = 0; i < n; i++) {
    const nextI = (i + 1) % n;
    const p1 = pts[i];
    const p2 = pts[nextI];

    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const len = Math.hypot(dx, dy) || 1.0;
    const nx = dy / len;
    const ny = -dx / len;

    const baseOffset = vertices.length / 3;

    // 4 Quad Vertices
    vertices.push(p1[0], p1[1], zBase);
    normals.push(nx, ny, 0);

    vertices.push(p2[0], p2[1], zBase);
    normals.push(nx, ny, 0);

    vertices.push(p2[0], p2[1], zTop);
    normals.push(nx, ny, 0);

    vertices.push(p1[0], p1[1], zTop);
    normals.push(nx, ny, 0);

    // 2 Triangles
    indices.push(baseOffset, baseOffset + 1, baseOffset + 2);
    indices.push(baseOffset, baseOffset + 2, baseOffset + 3);
  }

  return {
    vertexCount: vertices.length / 3,
    triangleCount: indices.length / 3,
    vertices,
    indices,
    normals,
  };
}

/**
 * Builds full 3D multi-floor cadastral digital twin
 */
export function generateCadastralBuilding(
  plot: CadastralPlot,
  preset: FloorplanPreset
): CadastralUnit[] {
  const units: CadastralUnit[] = [];
  const owners = [
    'Rajesh Sharma (Bhu-Owner)',
    'Priya Sundaram (Co-Owner)',
    'Vikramaditya Verma',
    'Ananya Deshmukh',
    'TechCorp Global Ltd',
    'Siddharth Malhotra',
    'Kavita Ranganathan',
  ];

  for (let floor = 0; floor < plot.totalFloors; floor++) {
    const floorLabel = floor === 0 ? 'Ground Floor (G0)' : `Floor ${floor} (F${floor < 10 ? '0' + floor : floor})`;
    const zBase = floor * plot.ceilingHeightPerFloor;
    const zTop = zBase + plot.ceilingHeightPerFloor;
    const altitudeAmslCentroid = plot.groundElevationAmsl + zBase + plot.ceilingHeightPerFloor / 2.0;

    preset.units.forEach((presetUnit, unitIdx) => {
      const uIndex = unitIdx + 1;
      const poly = presetUnit.polygon;
      const area = calculatePolygonArea(poly);
      const rawC2d = calculatePolygonCentroid(poly);

      // Point-in-Polygon validation
      const isInside = isPointInPolygon(rawC2d, poly);
      let anchorX = rawC2d.x;
      let anchorY = rawC2d.y;
      let poleData: { x: number; y: number; distance: number } | undefined = undefined;
      let anchorMethod: 'standard_centroid' | 'polylabel_pole_of_inaccessibility' = 'standard_centroid';

      if (!isInside) {
        // Fallback to Pole of Inaccessibility (center of maximum inscribed circle)
        poleData = calculatePoleOfInaccessibility(poly, 0.02);
        anchorX = poleData.x;
        anchorY = poleData.y;
        anchorMethod = 'polylabel_pole_of_inaccessibility';
      }

      const centroid3D: Centroid3D = {
        x: Math.round(anchorX * 100) / 100,
        y: Math.round(anchorY * 100) / 100,
        z: Math.round((zBase + plot.ceilingHeightPerFloor / 2.0) * 100) / 100,
        zAmsl: Math.round(altitudeAmslCentroid * 100) / 100,
        isPointInPolygon: isInside,
        anchorType: isInside ? 'centroid' : 'polylabel_pole_of_inaccessibility',
        rawMathematicalCentroid: {
          x: Math.round(rawC2d.x * 100) / 100,
          y: Math.round(rawC2d.y * 100) / 100,
        },
        poleOfInaccessibility: poleData ? { x: poleData.x, y: poleData.y } : undefined,
        inscribedRadius: poleData?.distance,
      };

      const xs = poly.map((p) => p[0]);
      const ys = poly.map((p) => p[1]);
      const bounds3D: Bounds3D = {
        minX: Math.min(...xs),
        minY: Math.min(...ys),
        minZ: zBase,
        maxX: Math.max(...xs),
        maxY: Math.max(...ys),
        maxZ: zTop,
        baseAmsl: plot.groundElevationAmsl + zBase,
        topAmsl: plot.groundElevationAmsl + zTop,
      };

      const mesh = buildExtrudedMesh(poly, zBase, zTop);

      // Generate 3D ULPIN anchored to guaranteed interior coordinates
      const ulpinGen = generate3DULPIN(
        plot.latitude,
        plot.longitude,
        floor,
        centroid3D,
        altitudeAmslCentroid,
        uIndex
      );

      const unitId = `FL${floor.toString().padStart(2, '0')}-U${uIndex.toString().padStart(2, '0')}`;
      const color = FLOOR_COLORS[floor % FLOOR_COLORS.length];
      const owner = owners[(floor * preset.units.length + unitIdx) % owners.length];

      units.push({
        unitId,
        unitName: `${floorLabel} - ${presetUnit.name}`,
        spaceType: presetUnit.spaceType,
        floorNumber: floor,
        floorLabel,
        ulpin14: ulpinGen.ulpin14,
        formattedUlpin: ulpinGen.formattedUlpin,
        isUlpinValid: ulpinGen.isValid,
        ulpinBreakdown: {
          ...ulpinGen.breakdown,
          anchorType: centroid3D.anchorType,
        },
        floorAreaSqMeters: Math.round(area * 100) / 100,
        volumeCubicMeters: Math.round(area * plot.ceilingHeightPerFloor * 100) / 100,
        ceilingHeightMeters: plot.ceilingHeightPerFloor,
        zBase: Math.round(zBase * 100) / 100,
        zTop: Math.round(zTop * 100) / 100,
        altitudeAmslCentroid: Math.round(altitudeAmslCentroid * 100) / 100,
        centroid3D,
        bounds3D,
        polygon2D: poly,
        mesh,
        color,
        ownerName: owner,
        propertyTaxId: `TAX-2026-${plot.district.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
        isIrregularShape: !isInside,
        anchorMethod,
      });
    });
  }

  return units;
}
