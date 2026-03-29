# Mosh Implementation Log

## Auto-Layout & Node Grouping - Completed

### Features Implemented

#### 1. Auto-Layout
- Installed `@dagrejs/dagre` for graph layout calculations
- Created `src/layout/autoLayout.ts` with:
  - `computeAutoLayout()` - Dagre-based left-to-right layout
  - Modulation connections excluded from ranking (prevents LFOs being far left)
  - Helper functions for node type ranking
- Added `autoLayoutNodes()` action to patchStore
- Added "Auto Layout" button to GraphCanvas toolbar

#### 2. Node Grouping (Hierarchical Patches)
- Enhanced `PatchGroup` type with:
  - `ExposedPort` interface for dynamic port exposure
  - `collapsed` state for collapsing groups into single nodes
  - `collapsedPosition` for collapsed node placement
  - `color` for group theming
- Created `src/layout/groupUtils.ts` with:
  - `detectExposedPorts()` - Auto-detect ports needing exposure
  - `calculateGroupCenter()` - Position calculation
  - `remapConnectionsForCollapsedGroup()` - Connection remapping

#### 3. Group Store Actions
All group operations in patchStore:
- `createGroup(name, nodeIds)` - Create from selection
- `deleteGroup(groupId)` - Remove group
- `collapseGroup(groupId)` / `expandGroup(groupId)` - Toggle collapse
- `diveIntoGroup(groupId)` / `exitGroup()` - Navigate hierarchy
- `exposePort()` / `unexposePort()` - Port management
- `duplicateGroup(groupId, position)` - Clone groups with remapped IDs

#### 4. UI Components
- `GroupNodeUI` component for collapsed groups
  - Dynamic handles based on exposed ports
  - Expand/Edit/Copy buttons
  - Color-coded theming
- GraphCanvas enhancements:
  - Multi-selection support (drag to select)
  - "Create Group" button (appears with 2+ nodes selected)
  - Groups panel showing active groups
  - Breadcrumb navigation when inside a group
  - Double-click group to dive in

### Files Modified
- `package.json` - Added @dagrejs/dagre dependency
- `src/patch/types.ts` - Added ExposedPort, enhanced PatchGroup
- `src/patch/patchStore.ts` - Added all new actions
- `src/ui/graph/GraphCanvas.tsx` - Added toolbar, panels, group support
- `src/ui/graph/nodeTypes/index.ts` - Registered GroupNodeUI

### Files Created
- `src/layout/autoLayout.ts` - Dagre layout algorithm
- `src/layout/groupUtils.ts` - Group utility functions
- `src/ui/graph/nodeTypes/GroupNodeUI.tsx` - Collapsed group UI

### Usage

**Auto Layout:**
1. Click "Auto Layout" button in toolbar
2. Nodes arrange left-to-right by signal flow

**Creating Groups:**
1. Drag-select multiple nodes (at least 2)
2. Click "Create Group" button
3. Enter group name
4. Group appears in Groups panel

**Collapsing Groups:**
1. Click `[-]` on group in Groups panel
2. Group becomes single node with exposed ports
3. Click "Expand" on collapsed node to restore

**Diving Into Groups:**
1. Double-click collapsed group, OR
2. Click `[>]` on group in Groups panel, OR
3. Click "Edit" on collapsed group node
4. Breadcrumb shows current location
5. Click "Exit" or "Root" to return

**Duplicating Groups:**
1. Click "Copy" on collapsed group node
2. New instance created with all internal nodes/connections
