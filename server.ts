import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { getInitialSlabs } from './src/lib/initialData.js';
import { ERPItem, SlabRange } from './src/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'db.json');

app.use(express.json());

// Ensure the database is initialized
function loadDatabase(): { slabs: SlabRange[]; items: ERPItem[] } {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(data);
      if (parsed && Array.isArray(parsed.slabs) && Array.isArray(parsed.items)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to parse db.json, resetting to initial state', err);
  }

  // Create initial state
  const slabs = getInitialSlabs();
  const items: ERPItem[] = [];
  const state = { slabs, items };
  fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf8');
  return state;
}

function saveDatabase(slabs: SlabRange[], items: ERPItem[]) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ slabs, items }, null, 2), 'utf8');
}

// Helpers for formatted sequence
function formatSequence(num: number, category: string): string {
  if (category === 'FA') {
    return num.toString();
  }
  return num.toString().padStart(4, '0');
}

// REST API Endpoints

// 1. Reset Database to initial state
app.post('/api/reset', (req, res) => {
  const slabs = getInitialSlabs();
  const items: ERPItem[] = [];
  saveDatabase(slabs, items);
  res.json({ message: 'Database reset successfully', slabs, items });
});

// 2. Get Slabs
app.get('/api/slabs', (req, res) => {
  const { slabs } = loadDatabase();
  res.json(slabs);
});

// 3. Update/Add Slab (Admin provisioning)
app.put('/api/slabs/:id', (req, res) => {
  const { id } = req.params;
  const { startNum, endNum, currentNum, status } = req.body;
  const { slabs, items } = loadDatabase();

  const slabIndex = slabs.findIndex((s) => s.id === id);
  if (slabIndex === -1) {
    return res.status(404).json({ error: `Slab range with ID "${id}" not found.` });
  }

  const slab = slabs[slabIndex];
  const finalStartNum = typeof startNum === 'number' ? startNum : slab.startNum;
  const finalEndNum = typeof endNum === 'number' ? endNum : slab.endNum;

  // Validation
  if (typeof startNum === 'number' && typeof endNum === 'number') {
    if (startNum < 0 || endNum < startNum) {
      return res.status(400).json({ error: 'Invalid range: startNum must be >= 0 and endNum must be >= startNum.' });
    }
    slab.startNum = startNum;
    slab.endNum = endNum;
    // If currentNum is below the new start range, reset/adjust it
    if (slab.currentNum < startNum) {
      slab.currentNum = startNum;
    }
  }

  if (typeof currentNum === 'number') {
    if (currentNum < finalStartNum || currentNum > finalEndNum + 1) {
      return res.status(400).json({ error: `Invalid counter: currentNum must be between startNum (${finalStartNum}) and endNum + 1 (${finalEndNum + 1}).` });
    }
    slab.currentNum = currentNum;
  }

  if (status === 'Active' || status === 'Inactive') {
    slab.status = status;
  }

  saveDatabase(slabs, items);
  res.json({ message: 'Slab range updated successfully', slab });
});

// 4. Get Items in Item Master
app.get('/api/items', (req, res) => {
  const { items } = loadDatabase();
  res.json(items);
});

// 5. Generate Code and Add Item
app.post('/api/items', (req, res) => {
  const { category, groupCode, typeCode, name } = req.body;

  if (!category || !typeCode || !name || name.trim() === '') {
    return res.status(400).json({ error: 'Required fields: category, typeCode, name' });
  }

  const { slabs, items } = loadDatabase();

  // Find matching slab range
  let slab: SlabRange | undefined;

  if (category === 'MFG-Z') {
    slab = slabs.find(
      (s) => s.category === 'MFG-Z' && s.groupCode === groupCode && s.typeCode === typeCode
    );
  } else if (category === 'MFG-R') {
    slab = slabs.find(
      (s) => s.category === 'MFG-R' && s.groupCode === groupCode && s.typeCode === typeCode
    );
  } else if (category === 'MFG-SUPPORT') {
    slab = slabs.find((s) => s.category === 'MFG-SUPPORT' && s.typeCode === typeCode);
  } else if (category === 'TRD') {
    slab = slabs.find(
      (s) => s.category === 'TRD' && s.groupCode === groupCode && s.typeCode === typeCode
    );
  } else if (category === 'FA') {
    slab = slabs.find((s) => s.category === 'FA' && s.typeCode === typeCode);
  }

  if (!slab) {
    return res.status(400).json({ error: 'No matching slab/range mapping found for selected options.' });
  }

  // Active status filter: Consider only Active Codes when updating/assigning
  if (slab.status !== 'Active') {
    return res.status(400).json({ error: `Slab range for this selection is currently 'Inactive'. Please activate it in Admin settings first.` });
  }

  // Saturation / Bounds check
  if (slab.currentNum > slab.endNum) {
    return res.status(400).json({
      error: `Range Saturation Error! The sequence has reached the upper boundary of ${slab.endNum} for range "${slab.id}". No further codes can be generated. Please contact administrator to expand the range limit.`,
    });
  }

  const assignedSeqNum = slab.currentNum;

  // Generate unique item code based on standard matrices formatting
  let code = '';
  const paddedSeq = formatSequence(assignedSeqNum, category);

  if (category === 'MFG-Z') {
    code = `Z-${groupCode}-${typeCode}-${paddedSeq}`;
  } else if (category === 'MFG-R') {
    code = `R-${groupCode}-${typeCode}-${paddedSeq}`;
  } else if (category === 'MFG-SUPPORT') {
    code = `SUP-${typeCode}-${paddedSeq}`;
  } else if (category === 'TRD') {
    code = `TRD-${groupCode}-${typeCode}-${paddedSeq}`;
  } else if (category === 'FA') {
    code = `FA-${typeCode}-${paddedSeq}`;
  }

  // Double check duplicates (just in case)
  const isDuplicate = items.some((item) => item.code === code);
  if (isDuplicate) {
    // If somehow duplicated (e.g. custom sequences), auto-seek next
    return res.status(400).json({ error: `Code conflict! Code "${code}" already exists in Item Master (CFG0200).` });
  }

  // Create new item
  const newItem: ERPItem = {
    code,
    originalCode: null,
    name: name.trim(),
    category,
    groupCode: slab.groupCode,
    groupName: slab.groupName,
    typeCode: slab.typeCode,
    typeName: slab.typeName,
    sequenceNum: assignedSeqNum,
    status: 'Active',
    conversion: null,
    createdAt: new Date().toISOString(),
  };

  // Increment next sequential number
  slab.currentNum += 1;

  // Insert to list
  items.unshift(newItem); // New items listed first

  // Save database
  saveDatabase(slabs, items);

  res.status(201).json({ message: 'Item codified successfully!', item: newItem, slab });
});

// 6. Convert assigned code (Spares Prefix R / Optional Accessory Prefix O)
app.post('/api/items/convert', (req, res) => {
  const { code, targetType } = req.body;

  if (!code || !targetType) {
    return res.status(400).json({ error: 'Required fields: code, targetType' });
  }

  if (targetType !== 'Spare' && targetType !== 'OptionalAccessory') {
    return res.status(400).json({ error: 'targetType must be "Spare" or "OptionalAccessory"' });
  }

  const { slabs, items } = loadDatabase();

  const itemIndex = items.findIndex((i) => i.code === code);
  if (itemIndex === -1) {
    return res.status(404).json({ error: `Item with code "${code}" not found in Item Master.` });
  }

  const item = items[itemIndex];

  if (item.conversion) {
    return res.status(400).json({ error: `Item has already been converted to "${item.conversion}".` });
  }

  // Backup original code
  item.originalCode = item.code;

  // Apply Prefix
  const prefix = targetType === 'Spare' ? 'R' : 'O';
  item.code = `${prefix}-${item.code}`;
  item.conversion = targetType;

  // Save database
  saveDatabase(slabs, items);

  res.json({ message: `Converted successfully to ${targetType}!`, item });
});

// 7. Update Item Details (e.g., name)
app.put('/api/items/:code', (req, res) => {
  const { code } = req.params;
  const { name } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Item name is required.' });
  }

  const { slabs, items } = loadDatabase();
  const itemIndex = items.findIndex((i) => i.code === code);
  if (itemIndex === -1) {
    return res.status(404).json({ error: `Item with code "${code}" not found in Item Master.` });
  }

  items[itemIndex].name = name.trim();
  saveDatabase(slabs, items);

  res.json({ message: 'Item details updated successfully!', item: items[itemIndex] });
});

// 8. Revert Character Conversion (R- or O- prefix)
app.post('/api/items/revert', (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Required fields: code' });
  }

  const { slabs, items } = loadDatabase();
  const itemIndex = items.findIndex((i) => i.code === code);
  if (itemIndex === -1) {
    return res.status(404).json({ error: `Item with code "${code}" not found in Item Master.` });
  }

  const item = items[itemIndex];
  if (!item.conversion || !item.originalCode) {
    return res.status(400).json({ error: 'This item has not been converted.' });
  }

  // Restore original code
  item.code = item.originalCode;
  item.originalCode = null;
  item.conversion = null;

  saveDatabase(slabs, items);
  res.json({ message: 'Conversion reverted successfully!', item });
});

// Start Express server and integrate with Vite
async function startServer() {
  // Make sure db.json is initialized
  loadDatabase();

  // If in dev mode, run Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files from Vite build folder
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ERP Codification Server running on http://localhost:${PORT}`);
  });
}

startServer();
