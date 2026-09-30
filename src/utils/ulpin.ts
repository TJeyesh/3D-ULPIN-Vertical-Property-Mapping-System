import { Centroid3D, ULPINBreakdown } from '../types/cadastre';

const BASE36 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Encodes latitude and longitude into an 8-character base geohash (Base36).
 */
export function encodeGeohash(lat: number, lon: number, precision: number = 8): string {
  let latInterval = [-90.0, 90.0];
  let lonInterval = [-180.0, 180.0];
  const geohash: string[] = [];
  const bits = [16, 8, 4, 2, 1];
  let bit = 0;
  let ch = 0;
  let even = true;

  while (geohash.length < precision) {
    if (even) {
      const mid = (lonInterval[0] + lonInterval[1]) / 2.0;
      if (lon > mid) {
        ch |= bits[bit];
        lonInterval[0] = mid;
      } else {
        lonInterval[1] = mid;
      }
    } else {
      const mid = (latInterval[0] + latInterval[1]) / 2.0;
      if (lat > mid) {
        ch |= bits[bit];
        latInterval[0] = mid;
      } else {
        latInterval[1] = mid;
      }
    }

    even = !even;
    if (bit < 4) {
      bit += 1;
    } else {
      geohash.push(BASE36[ch % 36]);
      bit = 0;
      ch = 0;
    }
  }

  return geohash.join('');
}

/**
 * Encodes vertical elevation & floor tier into 3 alphanumeric characters.
 */
export function encodeVerticalTier(floorNumber: number, _altitudeAmsl?: number): string {
  let tierChar: string;
  let floorVal: number;

  if (floorNumber < 0) {
    tierChar = 'B';
    floorVal = Math.abs(floorNumber);
  } else if (floorNumber === 0) {
    tierChar = 'G';
    floorVal = 0;
  } else if (floorNumber < 36) {
    tierChar = 'F';
    floorVal = floorNumber;
  } else {
    tierChar = 'H';
    floorVal = floorNumber % 36;
  }

  const char2 = BASE36[Math.floor(floorVal / 36) % 36];
  const char3 = BASE36[floorVal % 36];
  return `${tierChar}${char2}${char3}`;
}

/**
 * Encodes relative 3D subunit centroid offset into 2 alphanumeric characters.
 */
export function encodeSubunitVoxel(centroidX: number, centroidY: number, unitIndex: number = 1): string {
  const gridX = Math.floor(Math.abs(centroidX) * 10) % 36;
  const gridY = Math.floor(Math.abs(centroidY) * 10) % 36;
  const hashVal = (gridX * 36 + gridY + unitIndex * 7) % (36 * 36);

  const c1 = BASE36[Math.floor(hashVal / 36)];
  const c2 = BASE36[hashVal % 36];
  return `${c1}${c2}`;
}

/**
 * Calculates deterministic Mod-36 Checksum for 13-character payload.
 */
export function computeMod36Checksum(payload13: string): string {
  let weightSum = 0;
  const weights = [1, 3, 7, 9];

  for (let i = 0; i < payload13.length; i++) {
    const char = payload13[i].toUpperCase();
    let val = BASE36.indexOf(char);
    if (val === -1) val = 0;
    const weight = weights[i % 4];
    weightSum += val * weight;
  }

  const checkVal = (36 - (weightSum % 36)) % 36;
  return BASE36[checkVal];
}

/**
 * Generates the full 14-digit Vertical 3D ULPIN (3D Bhu-Aadhaar).
 */
export function generate3DULPIN(
  baseLat: number,
  baseLon: number,
  floorNumber: number,
  centroid3D: Centroid3D,
  altitudeAmsl?: number,
  unitIndex: number = 1
): {
  ulpin14: string;
  formattedUlpin: string;
  isValid: boolean;
  breakdown: ULPINBreakdown;
} {
  const baseGeocode = encodeGeohash(baseLat, baseLon, 8);
  const amsl = altitudeAmsl ?? (centroid3D.zAmsl ?? 215.0 + floorNumber * 3.2);
  const verticalTier = encodeVerticalTier(floorNumber, amsl);
  const voxelHash = encodeSubunitVoxel(centroid3D.x, centroid3D.y, unitIndex);

  const payload13 = `${baseGeocode}${verticalTier}${voxelHash}`.toUpperCase();
  const checkChar = computeMod36Checksum(payload13);
  const fullUlpin = `${payload13}${checkChar}`;
  const formatted = `${baseGeocode}-${verticalTier}-${voxelHash}-${checkChar}`;

  return {
    ulpin14: fullUlpin,
    formattedUlpin: formatted,
    isValid: validateULPIN(fullUlpin),
    breakdown: {
      baseCadastralGeocode: baseGeocode,
      verticalFloorTier: verticalTier,
      subunitVoxelHash: voxelHash,
      mod36Checksum: checkChar,
      floorNumber,
      altitudeAmslMeters: amsl,
      centroid3D,
    },
  };
}

/**
 * Validates any 14-digit ULPIN string against Mod-36 Luhn rule.
 */
export function validateULPIN(ulpinStr: string): boolean {
  const clean = ulpinStr.replace(/-/g, '').trim().toUpperCase();
  if (clean.length !== 14) return false;
  const payload13 = clean.substring(0, 13);
  const expectedCheck = computeMod36Checksum(payload13);
  return clean[13] === expectedCheck;
}

/**
 * Decodes structural metadata from a 14-digit 3D ULPIN.
 */
export function decodeULPIN(ulpinStr: string): {
  isValid: boolean;
  baseGeocode: string;
  floorTier: string;
  floorType: string;
  decodedFloorNumber: number;
  voxelHash: string;
  checksum: string;
} {
  const clean = ulpinStr.replace(/-/g, '').trim().toUpperCase();
  const isValid = validateULPIN(clean);

  if (clean.length < 14) {
    return {
      isValid: false,
      baseGeocode: clean.substring(0, 8),
      floorTier: clean.substring(8, 11),
      floorType: 'Unknown',
      decodedFloorNumber: 0,
      voxelHash: clean.substring(11, 13),
      checksum: clean.substring(13, 14),
    };
  }

  const baseGeocode = clean.substring(0, 8);
  const floorTier = clean.substring(8, 11);
  const voxelHash = clean.substring(11, 13);
  const checksum = clean.substring(13, 14);

  const tierType = floorTier[0];
  let floorType = 'Standard Floor';
  let decodedFloorNumber = 0;

  if (tierType === 'G') {
    floorType = 'Ground Level';
    decodedFloorNumber = 0;
  } else if (tierType === 'B') {
    floorType = 'Basement Level';
    const num = BASE36.indexOf(floorTier[2]);
    decodedFloorNumber = -(num > 0 ? num : 1);
  } else if (tierType === 'F') {
    floorType = 'Upper Floor';
    const c2 = BASE36.indexOf(floorTier[1]);
    const c3 = BASE36.indexOf(floorTier[2]);
    decodedFloorNumber = c2 * 36 + c3;
  } else if (tierType === 'H') {
    floorType = 'High-rise Tower Tier';
    const c2 = BASE36.indexOf(floorTier[1]);
    const c3 = BASE36.indexOf(floorTier[2]);
    decodedFloorNumber = 36 + c2 * 36 + c3;
  }

  return {
    isValid,
    baseGeocode,
    floorTier,
    floorType,
    decodedFloorNumber,
    voxelHash,
    checksum,
  };
}
