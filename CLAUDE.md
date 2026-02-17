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

### Build-time Ontology Parser

`scripts/parse-ontology.js` reads the TTL schema from `../digitalhome-cloud-semantic-core/ontology/dhc-core.schema.ttl` and outputs `src/data/ontology-graph.json` with `{ nodes, links }`. Run `yarn parse-ontology` whenever the ontology changes.

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
| Semantic Core | `digitalhome-cloud-semantic-core` | — | RDF/OWL ontology repo |

The portal owns the Amplify Gen1 backend. The modeler is currently a standalone frontend (no Amplify backend integration).

All repos use `stage` branch for staging work before merging to `main`.

## Deployment

Amplify Hosting with branch-to-environment mapping:
- `main` → production (`modeler.digitalhome.cloud`)
- `stage` → staging

Build spec is in `amplify.yml`. The build runs `npm run build` and deploys `public/`.
