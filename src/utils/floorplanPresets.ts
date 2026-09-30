import { FloorplanPreset } from '../types/cadastre';

export const FLOORPLAN_PRESETS: FloorplanPreset[] = [
  {
    id: 'ground-multi-unit-commercial',
    name: 'Ground Floor Multi-Unit Commercial Complex (Dual Shops & L-Shaped Retail)',
    category: 'Multi-Unit Commercial Ground Floor',
    description: 'Ground floor layout featuring two independent retail shops, an ATM vestibule, and an irregular L-shaped hypermarket unit demonstrating Shapely Point-in-Polygon & Polylabel interior anchor fallback.',
    unitCount: 4,
    totalAreaSqM: 380,
    units: [
      {
        name: 'Shop 01: Retail Pharmacy & Medicals',
        spaceType: 'Commercial Retail Shop',
        polygon: [
          [0.0, 0.0],
          [6.5, 0.0],
          [6.5, 7.0],
          [0.0, 7.0],
          [0.0, 0.0],
        ],
      },
      {
        name: 'Shop 02: Artisan Bakery & Cafe',
        spaceType: 'Commercial Retail Shop',
        polygon: [
          [7.5, 0.0],
          [14.0, 0.0],
          [14.0, 7.0],
          [7.5, 7.0],
          [7.5, 0.0],
        ],
      },
      {
        name: 'Unit 03: L-Shaped Supermarket & Department Store',
        spaceType: 'Irregular L-Shaped Commercial Unit',
        polygon: [
          // L-shaped unit: Left vertical wing [0 to 7] x [8 to 20], Bottom horizontal wing [0 to 22] x [8 to 13]
          [0.0, 8.5],
          [22.0, 8.5],
          [22.0, 13.5],
          [7.5, 13.5],
          [7.5, 20.0],
          [0.0, 20.0],
          [0.0, 8.5],
        ],
      },
      {
        name: 'Shop 04: 24/7 Digital Banking & ATM Kiosk',
        spaceType: 'Commercial Kiosk',
        polygon: [
          [15.0, 0.0],
          [22.0, 0.0],
          [22.0, 7.0],
          [15.0, 7.0],
          [15.0, 0.0],
        ],
      },
    ],
  },
  {
    id: 'irregular-l-penthouse',
    name: 'Multi-Unit High-Rise with L-Shaped Penthouse & Corner Suites',
    category: 'Irregular Residential & Penthouse',
    description: 'High-rise level with an irregular L-shaped grand penthouse suite whose bounding-box mathematical centroid falls into the open sky-terrace void, demonstrating automated Pole of Inaccessibility (polylabel) resolution.',
    unitCount: 3,
    totalAreaSqM: 350,
    units: [
      {
        name: 'Penthouse Suite 501: Irregular L-Shaped Presidential Suite',
        spaceType: 'Irregular L-Shaped Residential',
        polygon: [
          // Concave / L-shaped: outer 0..18 x 0..18 with a large inner cutout 8..18 x 8..18
          [0.0, 0.0],
          [18.0, 0.0],
          [18.0, 7.0],
          [7.0, 7.0],
          [7.0, 18.0],
          [0.0, 18.0],
          [0.0, 0.0],
        ],
      },
      {
        name: 'Apartment Unit 502: Executive East Suite',
        spaceType: 'Executive 2BHK',
        polygon: [
          [8.5, 8.5],
          [18.0, 8.5],
          [18.0, 13.0],
          [8.5, 13.0],
          [8.5, 8.5],
        ],
      },
      {
        name: 'Apartment Unit 503: Sky Terrace Studio & Solarium',
        spaceType: 'Sky Studio',
        polygon: [
          [8.5, 14.0],
          [18.0, 14.0],
          [18.0, 18.0],
          [8.5, 18.0],
          [8.5, 14.0],
        ],
      },
    ],
  },
  {
    id: 'sih-benchmark',
    name: 'SIH26011 Benchmark 4-Flat Cadastral Layout',
    category: 'Multi-Family Residential',
    description: 'Official Smart India Hackathon 2026 benchmark 4-unit apartment floor layout with common lobby corridor.',
    unitCount: 4,
    totalAreaSqM: 320,
    units: [
      {
        name: 'Apartment Unit 101 (3BHK North-East)',
        spaceType: 'Apartment 3BHK',
        polygon: [
          [0.0, 0.0],
          [9.5, 0.0],
          [9.5, 7.5],
          [0.0, 7.5],
          [0.0, 0.0],
        ],
      },
      {
        name: 'Apartment Unit 102 (2BHK South-East)',
        spaceType: 'Apartment 2BHK',
        polygon: [
          [11.5, 0.0],
          [20.0, 0.0],
          [20.0, 7.5],
          [11.5, 7.5],
          [11.5, 0.0],
        ],
      },
      {
        name: 'Apartment Unit 103 (3BHK North-West)',
        spaceType: 'Apartment 3BHK',
        polygon: [
          [0.0, 9.5],
          [9.5, 9.5],
          [9.5, 17.0],
          [0.0, 17.0],
          [0.0, 9.5],
        ],
      },
      {
        name: 'Apartment Unit 104 (Executive Suite South-West)',
        spaceType: 'Executive Suite',
        polygon: [
          [11.5, 9.5],
          [20.0, 9.5],
          [20.0, 17.0],
          [11.5, 17.0],
          [11.5, 9.5],
        ],
      },
    ],
  },
  {
    id: 'luxury-2bhk-rooms',
    name: 'Single Apartment Detailed Room Partitioning',
    category: 'Detailed Architectural Layout',
    description: 'Detailed vector extraction of individual room parcels (Master Bedroom, Living Hall, Kitchen, Balconies).',
    unitCount: 5,
    totalAreaSqM: 145,
    units: [
      {
        name: 'Living & Dining Great Room',
        spaceType: 'Living & Dining',
        polygon: [
          [0.0, 0.0],
          [7.0, 0.0],
          [7.0, 6.0],
          [0.0, 6.0],
          [0.0, 0.0],
        ],
      },
      {
        name: 'Master Bedroom & Walk-in Closet',
        spaceType: 'Master Bedroom',
        polygon: [
          [7.5, 0.0],
          [13.0, 0.0],
          [13.0, 5.0],
          [7.5, 5.0],
          [7.5, 0.0],
        ],
      },
      {
        name: 'Modular Kitchen & Utility',
        spaceType: 'Kitchen',
        polygon: [
          [0.0, 6.5],
          [4.5, 6.5],
          [4.5, 11.0],
          [0.0, 11.0],
          [0.0, 6.5],
        ],
      },
      {
        name: 'Guest Bedroom & Study',
        spaceType: 'Bedroom',
        polygon: [
          [5.0, 6.5],
          [10.5, 6.5],
          [10.5, 11.0],
          [5.0, 11.0],
          [5.0, 6.5],
        ],
      },
      {
        name: 'Extended Sky Balcony',
        spaceType: 'Balcony',
        polygon: [
          [11.0, 5.5],
          [13.0, 5.5],
          [13.0, 11.0],
          [11.0, 11.0],
          [11.0, 5.5],
        ],
      },
    ],
  },
  {
    id: 'commercial-tech-hub',
    name: 'Commercial IT Park & Office Voxel Layout',
    category: 'Commercial High-Rise',
    description: 'High-density commercial building cadastral sub-parcels with vertical office suites and server rooms.',
    unitCount: 4,
    totalAreaSqM: 450,
    units: [
      {
        name: 'Suite A: Fintech Innovation Lab',
        spaceType: 'Commercial Suite',
        polygon: [
          [0.0, 0.0],
          [14.0, 0.0],
          [14.0, 8.0],
          [0.0, 8.0],
          [0.0, 0.0],
        ],
      },
      {
        name: 'Suite B: Open Co-Working Space',
        spaceType: 'Commercial Suite',
        polygon: [
          [15.5, 0.0],
          [26.0, 0.0],
          [26.0, 8.0],
          [15.5, 8.0],
          [15.5, 0.0],
        ],
      },
      {
        name: 'Suite C: Cloud Server Operations Center',
        spaceType: 'IT Infrastructure',
        polygon: [
          [0.0, 9.5],
          [10.0, 9.5],
          [10.0, 16.0],
          [0.0, 16.0],
          [0.0, 9.5],
        ],
      },
      {
        name: 'Suite D: Boardroom & Executive Conference',
        spaceType: 'Executive Suite',
        polygon: [
          [11.5, 9.5],
          [26.0, 9.5],
          [26.0, 16.0],
          [11.5, 16.0],
          [11.5, 9.5],
        ],
      },
    ],
  },
];
