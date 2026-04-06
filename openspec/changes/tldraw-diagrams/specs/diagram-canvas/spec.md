## ADDED Requirements

### Requirement: Vue-React bridge component
A reusable Vue component (`TldrawCanvas.vue`) mounts the tldraw React canvas using `createRoot`. It accepts props for initial snapshot, read-only mode, and an `onSave` callback.

#### Scenario: Mount tldraw canvas
- **WHEN** the TldrawCanvas component is mounted with a snapshot prop
- **THEN** a React root is created, tldraw renders with the provided snapshot, and the canvas is interactive

#### Scenario: Unmount tldraw canvas
- **WHEN** the Vue component is unmounted (route change, page leave)
- **THEN** the React root is unmounted and all tldraw event listeners are cleaned up

#### Scenario: Read-only mode
- **WHEN** TldrawCanvas is mounted with `readOnly: true`
- **THEN** all drawing tools are disabled, the user can only pan and zoom

### Requirement: Diagram editor page
A campaign page at `/campaigns/:id/diagrams/:diagramId` embeds the TldrawCanvas component, loads the diagram snapshot, and provides auto-save and manual save.

#### Scenario: Load existing diagram
- **WHEN** a user navigates to `/campaigns/:id/diagrams/:diagramId`
- **THEN** the diagram metadata and latest snapshot are fetched and the canvas renders with that snapshot

#### Scenario: Auto-save on changes
- **WHEN** the user makes changes on the canvas and 5 seconds elapse without further edits
- **THEN** the current snapshot is saved to the server via PUT

#### Scenario: Manual save
- **WHEN** the user clicks the Save button
- **THEN** the current snapshot is immediately saved to the server

#### Scenario: Role-based editing
- **WHEN** a player or visitor opens a diagram
- **THEN** the canvas renders in read-only mode

- **WHEN** a dm, co_dm, or editor opens a diagram
- **THEN** the canvas renders in full edit mode

### Requirement: Diagram list page
A campaign page at `/campaigns/:id/diagrams` shows all diagrams in the campaign.

#### Scenario: List diagrams
- **WHEN** a user navigates to `/campaigns/:id/diagrams`
- **THEN** all diagrams for the campaign are listed with title, type, and last updated date

#### Scenario: Create diagram
- **WHEN** a dm/co_dm/editor clicks "New Diagram" and enters a title
- **THEN** a new empty diagram is created and the user is navigated to its editor page

#### Scenario: Delete diagram
- **WHEN** a dm/co_dm clicks delete and confirms
- **THEN** the diagram and its snapshots are deleted

### Requirement: Vite dual-framework configuration
The build system supports both Vue SFC compilation and React JSX/TSX compilation without conflicts.

#### Scenario: Build succeeds with both frameworks
- **WHEN** `npm run build` is executed
- **THEN** Vue `.vue` files and React `.tsx` files both compile successfully

### Requirement: Code splitting
React and tldraw libraries are dynamically imported, not included in the main bundle.

#### Scenario: Non-diagram pages
- **WHEN** a user navigates to any page other than diagrams
- **THEN** React and tldraw are NOT loaded (not in the network requests)

#### Scenario: Diagram page load
- **WHEN** a user navigates to a diagram page for the first time
- **THEN** React and tldraw are loaded via dynamic import (separate chunks)
