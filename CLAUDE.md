# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DigitalHome.Cloud Modeler — a Gatsby 5 / React 18 web app providing a 3D interactive ontology viewer for the DHC core ontology (`dhc-core.schema.ttl`). Visualizes ~45 classes and ~25 properties across 7 design views as a force-directed 3D graph. Admin/dev tool in the DigitalHome.Cloud ecosystem.

## Commands

- `yarn develop` — Start local dev server (localhost:8002)
- `yarn build` — Production build (outputs to `public/`)
- `yarn clean` — Clear Gatsby cache (`.cache/` and `public/`)
- `yarn format` — Prettier formatting across all source files
- `yarn parse-ontology` — Regenerate `src/data/ontology-graph.json` from the TTL schema
- No test suite is configured yet

## Architecture

### 3D Ontology Viewer

The viewer uses a 3-panel layout:

```
┌──────────┬─────────────────────────┬──────────┐
│ Sidebar  │     3D Graph Canvas     │ Inspector│
│ (240px)  │      (flex: 1)          │ (280px)  │
└──────────┴─────────────────────────┴──────────┘
```

- `src/components/WorkspaceShell.js` — 3-panel layout, manages selected node and active view filter state
- `src/components/OntologyGraph.js` — SSR-safe 3D force graph (react-force-graph-3d via dynamic import)
- `src/components/OntologySidebar.js` — Left panel with collapsible design view sections
- `src/components/OntologyInspector.js` — Right panel showing selected node details
- `src/data/ontology-graph.json` — Pre-parsed graph data (generated, committed)

### Ontology Source & Lifecycle

The ontology lives inside this repo under `semantic-core/` (merged from the former `digitalhome-cloud-semantic-core` repo):

```
semantic-core/
  ontology/
    dhc-core.schema.ttl    ← core ontology (classes, properties, design views)
    context.jsonld          ← JSON-LD context for runtime use
  instances/
    DE-DEMO.ttl             ← demo instance data
  shapes/                   ← SHACL validation shapes
```

**Key principle:** Ontology changes are always **deployments**, not runtime edits. The TTL defines the foundational vocabulary — changing it affects all apps and instance data, so it follows a versioned release process.

**Flow:**
1. **Author** — TTL files are edited and versioned in this repo under `semantic-core/` (semantic versioning: `model-vX.Y.Z`)
2. **Build-time parse** — `scripts/parse-ontology.js` reads `semantic-core/ontology/dhc-core.schema.ttl` and generates `src/data/ontology-graph.json`
3. **CI/CD publish** — The pipeline publishes JSON-LD context and compiled artifacts to versioned S3 paths for runtime consumption by other apps (Designer, future Operator)
4. **Deploy** — Amplify Hosting deploys the modeler with the freshly parsed graph data baked in

When the ontology changes, the modeler must be rebuilt (`yarn parse-ontology && yarn build`) to reflect the new schema. This is intentional — the ontology is a foundation, not user content. Having the TTL in the same repo ensures ontology changes and their visualization are always in sync.

### Build-time Ontology Parser

`scripts/parse-ontology.js` reads `semantic-core/ontology/dhc-core.schema.ttl` and outputs `src/data/ontology-graph.json` with `{ nodes, links }`. Run `yarn parse-ontology` whenever the ontology changes.

### Design Views

Nodes are color-coded by `dhc:designView` annotation:
- Spatial (green #22c55e), Building (amber #f59e0b), Electrical (blue #3b82f6)
- Plumbing (cyan #06b6d4), Heating (red #ef4444), Network (purple #a855f7)
- Automation (pink #ec4899), Shared/none (white #e5e7eb)

### Navigation

Header uses env-var-driven URLs for cross-app navigation:
- `GATSBY_PORTAL_URL` → defaults to `https://portal.digitalhome.cloud`
- `GATSBY_DESIGNER_URL` → defaults to `https://designer.digitalhome.cloud`

### Internationalization

English only (`en`). Translation files in `src/locales/en/common.json`. Uses `gatsby-plugin-react-i18next`.

### Styling

Plain CSS in `src/styles/global.css`. Dark-mode theme with slate/blue palette. No CSS framework.

## Dependencies & Licenses

All dependencies are open source. Key libraries:

| Package | License | Notes |
|---------|---------|-------|
| react, react-dom | MIT | UI framework |
| gatsby | MIT | Static site generator |
| react-force-graph-3d | MIT | 3D force-directed graph (wraps Three.js + d3-force-3d) |
| three | MIT | WebGL 3D engine |
| i18next, react-i18next | MIT | Internationalization |
| gatsby-plugin-react-i18next | MIT | Gatsby i18n integration |

No copyleft (GPL/LGPL/AGPL) dependencies. All MIT — no attribution or source-sharing obligations beyond including the license file.

## Multi-Repo Ecosystem

| App | Repo | Port | URL |
|-----|------|------|-----|
| Portal | `digitalhome-cloud-portal` | 8000 | `portal.digitalhome.cloud` |
| Designer | `digitalhome-cloud-designer` | 8001 | `designer.digitalhome.cloud` |
| Modeler | `digitalhome-cloud-modeler` | 8002 | `modeler.digitalhome.cloud` |

The portal owns the Amplify Gen1 backend. The semantic-core ontology files live inside the modeler repo under `semantic-core/` (formerly a separate `digitalhome-cloud-semantic-core` repo).

All repos use `stage` branch for staging work before merging to `main`.

## Access Model

The modeler is an **expert and admin tool** — it visualizes the core ontology, which is general domain knowledge (not tenant-specific). No SmartHome ID is required.

| Mode | Who | Capabilities |
|------|-----|--------------|
| **DEMO** | Anyone (no login) | Full read-only 3D graph, browse all design views, inspect node details |
| **Authenticated** (future) | Admins (`dhc-admins` Cognito group) | Ontology editing, annotation, export — gated by Cognito group |

The ontology itself is not sensitive — it defines the vocabulary (classes like `Room`, `Circuit`, `Sensor`), not instance data. DEMO mode therefore shows the complete graph. Future authenticated features will allow curating and extending the ontology, restricted to platform administrators.

## Deployment

Amplify Hosting with branch-to-environment mapping:
- `main` → production (`modeler.digitalhome.cloud`)
- `stage` → staging

Build spec is in `amplify.yml`. The build runs `npm run build` and deploys `public/`.
