import { SlabRange } from '../types';

export const MFG_Z_GROUPS = [
  { code: 'FA', name: 'Fastalign' },
  { code: 'WA', name: 'Wheel Aligner' },
  { code: 'WB', name: 'Wheel Balancer' },
  { code: 'EA', name: 'Engine Analyser' },
  { code: 'EL', name: 'Electronic Spirit Level' },
  { code: 'IC', name: 'Interchangeable' },
  { code: 'TC', name: 'Tyre Changers' },
  { code: 'SM', name: 'Smoke Meter' },
  { code: 'EG', name: 'Gas Analyser' },
  { code: 'PS', name: 'Paint Booth' },
  { code: 'HA', name: 'Head Lamp Aligner' },
  { code: 'TI', name: 'Tyre Inflator' },
  { code: 'TP', name: 'Two Post Lift' },
  { code: 'AG', name: 'Digital Pressure Gauge' },
  { code: 'GO', name: 'AC Gas Charger' },
  { code: 'TS', name: 'Tyre Pressure Monitoring System' },
  { code: 'HS', name: 'Hand Sanitizer' },
  { code: 'CW', name: 'Vehicle Washer' },
  { code: 'EV', name: 'Electric Vehicle Charging Station' },
];

export const MFG_Z_TYPES = [
  { code: 'PDF+ 2', name: 'Component Class' },
  { code: 'PDF+ 1', name: 'Raw material' },
  { code: 'Y', name: 'Sub Part' },
  { code: 'P', name: 'Part' },
  { code: 'B', name: 'Mechanical B/O' },
  { code: 'E', name: 'Electronics B/O' },
  { code: 'F', name: 'Fasteners' },
  { code: 'MX', name: 'Master Sub Assembly' },
  { code: 'X', name: 'Sub Assembly' },
  { code: 'MA', name: 'Master Assembly' },
  { code: 'A', name: 'Assembly' },
  { code: 'ZO', name: 'Optional accessory' },
  { code: 'Z', name: 'Final product' },
];

export const MFG_R_GROUPS = [
  { code: 'RC', name: 'RF Remote Control' },
  { code: 'AS', name: 'Front Axle Setting' },
  { code: 'AL', name: 'End-Of-Line Wheel Alignment' },
];

export const MFG_R_TYPES = [
  { code: 'M', name: 'Raw Material' },
  { code: 'Y', name: 'Sub Part' },
  { code: 'P', name: 'Part' },
  { code: 'B', name: 'Mechanical B/O' },
  { code: 'E', name: 'Electronics B/O' },
  { code: 'F', name: 'Fasteners' },
  { code: 'MX', name: 'Master Sub Assembly' },
  { code: 'X', name: 'Sub Assembly' },
  { code: 'MA', name: 'Master Assembly' },
  { code: 'A', name: 'Assembly' },
  { code: 'RO', name: 'Optional accessory' },
  { code: 'R', name: 'Final project' },
];

export const MFG_SUPPORT_TYPES = [
  { code: 'H', name: 'Consumables', start: 1, end: 9999 },
  { code: 'HT', name: 'Consumable Tools', start: 1, end: 9999 },
  { code: 'SC', name: 'Stationery / Product Catalogue', start: 1, end: 9999 },
  { code: 'DE', name: 'Design Electronics', start: 330, end: 9999 },
  { code: 'DEP', name: 'Design Electronics Process', start: 2339, end: 9999 },
  { code: 'DM', name: 'Design Mechanical', start: 3339, end: 9999 },
  { code: 'DMP', name: 'Design Mechanical Process', start: 350, end: 9999 },
  { code: 'SP', name: 'Machinery Spares', start: 1, end: 9999 },
];

export const TRD_GROUPS = [
  { code: 'ACP', name: 'Air Compressor' },
  { code: 'AGC', name: 'AC Gas Charger' },
  { code: 'CLR', name: 'Collision Repair' },
  { code: 'GEN', name: 'Trading General' },
];

export const TRD_TYPES = [
  { code: 'T', name: 'Trading Product' },
  { code: 'TS', name: 'Trading Spares' },
  { code: 'TO', name: 'Trading Optional' },
  { code: 'TG', name: 'Trading General' },
];

export const FA_TYPES = [
  { code: 'BLD', name: 'Building (Factory)', start: 1000, end: 1999 },
  { code: 'PLM', name: 'Plant & Machinery', start: 2000, end: 2999 },
  { code: 'FUR', name: 'Furniture & Fittings', start: 3000, end: 3999 },
  { code: 'OFE', name: 'Office equipment', start: 4000, end: 4999 },
  { code: 'ELE', name: 'Electrical equipment', start: 5000, end: 5999 },
  { code: 'VEH', name: 'Vehicle', start: 6000, end: 6999 },
  { code: 'COM', name: 'Computer', start: 7000, end: 7999 },
  { code: 'SFT', name: 'Software', start: 8000, end: 8999 },
  { code: 'TLT', name: 'Tools & Tackles', start: 10000, end: 10999 },
];

export function getInitialSlabs(): SlabRange[] {
  const slabs: SlabRange[] = [];

  // 1. Manufacturing Product Codes (MFG-Z)
  for (const group of MFG_Z_GROUPS) {
    for (const type of MFG_Z_TYPES) {
      slabs.push({
        id: `MFG-Z-${group.code}-${type.code.replace(' ', '_')}`,
        category: 'MFG-Z',
        groupCode: group.code,
        groupName: group.name,
        typeCode: type.code,
        typeName: type.name,
        startNum: 1,
        endNum: 9999,
        currentNum: 1,
        status: 'Active',
      });
    }
  }

  // 2. Manufacturing Project Codes (MFG-R)
  for (const group of MFG_R_GROUPS) {
    for (const type of MFG_R_TYPES) {
      slabs.push({
        id: `MFG-R-${group.code}-${type.code}`,
        category: 'MFG-R',
        groupCode: group.code,
        groupName: group.name,
        typeCode: type.code,
        typeName: type.name,
        startNum: 1,
        endNum: 9999,
        currentNum: 1,
        status: 'Active',
      });
    }
  }

  // 3. Manufacturing Support Codes
  for (const type of MFG_SUPPORT_TYPES) {
    slabs.push({
      id: `SUP-${type.code}`,
      category: 'MFG-SUPPORT',
      groupCode: 'SUP',
      groupName: 'Manufacturing Support',
      typeCode: type.code,
      typeName: type.name,
      startNum: type.start,
      endNum: type.end,
      currentNum: type.start,
      status: 'Active',
    });
  }

  // 4. Trading Product Codes (TRD)
  for (const group of TRD_GROUPS) {
    for (const type of TRD_TYPES) {
      slabs.push({
        id: `TRD-${group.code}-${type.code}`,
        category: 'TRD',
        groupCode: group.code,
        groupName: group.name,
        typeCode: type.code,
        typeName: type.name,
        startNum: 1,
        endNum: 9999,
        currentNum: 1,
        status: 'Active',
      });
    }
  }

  // 5. Fixed Asset Codes (FA)
  for (const type of FA_TYPES) {
    slabs.push({
      id: `FA-${type.code}`,
      category: 'FA',
      groupCode: 'FA',
      groupName: 'Fixed Assets',
      typeCode: type.code,
      typeName: type.name,
      startNum: type.start,
      endNum: type.end,
      currentNum: type.start,
      status: 'Active',
    });
  }

  return slabs;
}
