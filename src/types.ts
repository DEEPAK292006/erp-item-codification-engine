export interface SlabRange {
  id: string; // Unique identifier (e.g., 'MFG-Z-WA-Z')
  category: 'MFG-Z' | 'MFG-R' | 'MFG-SUPPORT' | 'TRD' | 'FA';
  groupCode: string; // e.g., 'WA', 'RC', 'H', 'BLD'
  groupName: string; // e.g., 'Wheel Aligner', 'RF Remote Control', 'Consumables', 'Building'
  typeCode: string; // e.g., 'Z', 'M', 'T', '1000'
  typeName: string; // e.g., 'Final product', 'Sub Part', 'Trading Product', 'Office equipment'
  startNum: number; // e.g., 1 or 1000
  endNum: number; // e.g., 9999 or 1999
  currentNum: number; // Next sequential value to be assigned (starts at startNum)
  status: 'Active' | 'Inactive';
}

export interface ERPItem {
  code: string; // The generated item code, e.g. 'Z-WA-Z-0001' or 'FA-BLD-1002'
  originalCode: string | null; // Keeps track of pre-conversion code if converted
  name: string; // Name of the item
  category: 'MFG-Z' | 'MFG-R' | 'MFG-SUPPORT' | 'TRD' | 'FA';
  groupCode: string;
  groupName: string;
  typeCode: string;
  typeName: string;
  sequenceNum: number; // The numeric part of the code
  status: 'Active' | 'Inactive';
  conversion: 'Spare' | 'OptionalAccessory' | null;
  createdAt: string; // ISO date string
}
