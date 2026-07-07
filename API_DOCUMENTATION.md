# VERTEXT ERP - Item Codification Module (CFG0200)
## Developer API Documentation & Matrix Slabs Specifications

This service manages the core item codification matrices for the ERP system. It assigns sequential, collision-free unique codes to elements inside MFG-Z, MFG-R, MFG Support, TRD, and FA blocks.

---

### 1. Code Format Matrices

#### Matrix A: Manufacturing Product Codes (MFG-Z)
- **Format**: `Z-[Group]-[Type]-[SeqNumber]`
- **Prefix Modifier**: `Z-`
- **Product Groups**: Fastalign (FA), Wheel Aligner (WA), Wheel Balancer (WB), Engine Analyser (EA), Electronic Spirit Level (EL), Interchangeable (IC), Tyre Changers (TC), Smoke Meter (SM), Gas Analyser (EG), Paint Booth (PS), Head Lamp Aligner (HA), Tyre Inflator (TI), Two Post Lift (TP), Digital Pressure Gauge (AG), AC Gas Charger (GO), Tyre Pressure Monitoring System (TS), Hand Sanitizer (HS), Vehicle Washer (CW), Electric Vehicle Charging Station (EV).
- **Code Types**:
  - `PDF+ 2`: Component Class
  - `PDF+ 1`: Raw material
  - `Y`: Sub Part
  - `P`: Part
  - `B`: Mechanical B/O
  - `E`: Electronics B/O
  - `F`: Fasteners
  - `MX`: Master Sub Assembly
  - `X`: Sub Assembly
  - `MA`: Master Assembly
  - `A`: Assembly
  - `ZO`: Optional accessory
  - `Z`: Final product

#### Matrix B: Manufacturing Project Codes (MFG-R)
- **Format**: `R-[ProjectGroup]-[TypeSuffix]-[SeqNumber]`
- **Project Groups**: RF Remote Control (RC), Front Axle Setting (AS), End-Of-Line Wheel Alignment (AL).
- **Type Suffixes**: M, Y, P, B, E, F, MX, X, MA, A, RO, R.

#### Matrix C: Manufacturing Product Support Codes
- **Format**: `SUP-[SubType]-[SeqNumber]`
- **Predefined Slabs**:
  - `H`: Consumables (0001+)
  - `HT`: Consumable Tools (0001+)
  - `SC`: Stationery / Product Catalogue (0001+)
  - `DE`: Design Electronics (0330+)
  - `DEP`: Design Electronics Process (2339+)
  - `DM`: Design Mechanical (3339+)
  - `DMP`: Design Mechanical Process (0350+)
  - `SP`: Machinery Spares (0001+)

#### Matrix D: Trading Product Codes (TRD)
- **Format**: `TRD-[Group]-[Type]-[SeqNumber]`
- **Product Groups**: Air Compressor (ACP), AC Gas Charger (AGC), Collision Repair (CLR), Trading General (GEN).
- **Types**: T (Trading Product), TS (Trading Spares), TO (Trading Optional), TG (Trading General).

#### Matrix E: Fixed Asset Codes (FA)
- **Format**: `FA-[AssetType]-[SeqNumber]`
- **Predefined Sequential Blocks**:
  - `BLD`: Building (Factory) - [1000 - 1999]
  - `PLM`: Plant & Machinery - [2000 - 2999]
  - `FUR`: Furniture & Fittings - [3000 - 3999]
  - `OFE`: Office equipment - [4000 - 4999]
  - `ELE`: Electrical equipment - [5000 - 5999]
  - `VEH`: Vehicle - [6000 - 6999]
  - `COM`: Computer - [7000 - 7999]
  - `SFT`: Software - [8000 - 8999]
  - `TLT`: Tools & Tackles - [10000 - 10999]

---

### 2. Prefix Conversion Rules (Assigned Codes)

Once a code is codified and assigned in the Item Master (CFG0200) database, the engine can apply specific prefix modifications:
1. **Spares Conversion**: Pre-fix `R-` to the existing code (e.g. `R-Z-WA-Z-0001`).
2. **Optional Accessory Conversion**: Pre-fix `O-` to the existing code (e.g. `O-Z-WA-Z-0001`).

---

### 3. API Routes Reference

#### `GET /api/slabs`
- **Description**: Returns all configured code slabs, sequence limits, current sequence number counters, and status.
- **Response Format**:
```json
[
  {
    "id": "MFG-Z-WA-Z",
    "category": "MFG-Z",
    "groupCode": "WA",
    "groupName": "Wheel Aligner",
    "typeCode": "Z",
    "typeName": "Final product",
    "startNum": 1,
    "endNum": 9999,
    "currentNum": 1,
    "status": "Active"
  }
]
```

#### `PUT /api/slabs/:id`
- **Description**: Allows administrators to update slab boundary parameters or toggle range offline.
- **Request Parameters**:
  - `startNum` (number, optional)
  - `endNum` (number, optional)
  - `status` (string, optional: "Active" | "Inactive")
- **Response Format**:
```json
{
  "message": "Slab range updated successfully",
  "slab": { ... }
}
```

#### `GET /api/items`
- **Description**: Retrieves all registered item master records (Screen CFG0200).
- **Response Format**: Array of `ERPItem` objects.

#### `POST /api/items`
- **Description**: Codifies a new item, increments the slab sequence counter, and inserts the item into the database.
- **Request Body**:
```json
{
  "category": "MFG-Z",
  "groupCode": "WA",
  "typeCode": "Z",
  "name": "Heavy Duty 3D Aligner"
}
```
- **Response Format**: `201 Created` with the registered item object.

#### `POST /api/items/convert`
- **Description**: Applies Spare/Optional Accessory prefix conversion rules to an assigned item code.
- **Request Body**:
```json
{
  "code": "Z-WA-Z-0001",
  "targetType": "Spare" // "Spare" | "OptionalAccessory"
}
```

#### `POST /api/reset`
- **Description**: Erases item registry tables and restores standard slabs. Useful for demo configurations.
