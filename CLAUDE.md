# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DigitalHome.Cloud Modeler — a Gatsby 5 / React 18 web app providing a Blockly-based visual workspace for ontology modeling (OWL/RDFS). Admin-only tool in the DigitalHome.Cloud ecosystem.

## Commands

- `yarn develop` — Start local dev server (localhost:8002)
- `yarn build` — Production build (outputs to `public/`)
- `yarn clean` — Clear Gatsby cache (`.cache/` and `public/`)
- `yarn format` — Prettier formatting across all source files
- No test suite is configured yet

## Local Dev Setup

This app shares the Amplify Gen1 backend owned by the portal repo (`digitalhome-cloud-portal`). Copy `.env.development` from the portal repo (same backend, same `GATSBY_*` values) or use the `generate-aws-config-from-master.js` script after `amplify pull`.

**Files that must never be committed:** `src/aws-exports.js`, `.env.development` (both gitignored).

## Architecture

### Shared Backend

This app does **not** own an Amplify backend. The backend (Cognito, AppSync, DynamoDB, S3) lives in `digitalhome-cloud-portal/amplify/`. This repo is a frontend-only consumer.

### Blockly Workspace

- `src/blockly/blocks/dhc.js` — DHC ontology block definitions
- `src/blockly/blocks/ontology_blocks.js` — OWL/RDFS structure blocks
- `src/blockly/theme/dhc_ontology_theme.js` — Dark theme for ontology editor
- `src/blockly/toolbox.js` — Toolbox configuration
- `src/blockly/workspace.js` — Workspace initialization
- `src/components/WorkspaceShell.js` — Two-panel layout (Canvas + Inspector)

### Internationalization

English only (`en`). Translation files in `src/locales/en/common.json`. Uses `gatsby-plugin-react-i18next`.

### Styling

Plain CSS in `src/styles/global.css`. Dark-mode theme with slate/blue palette. No CSS framework.

## Multi-Repo Ecosystem

| App | Repo | Port | URL |
|-----|------|------|-----|
| Portal | `digitalhome-cloud-portal` | 8000 | `portal.digitalhome.cloud` |
| Designer | `digitalhome-cloud-designer` | 8001 | `designer.digitalhome.cloud` |
| Modeler | `digitalhome-cloud-modeler` | 8002 | `modeler.digitalhome.cloud` |
| Semantic Core | `digitalhome-cloud-semantic-core` | — | RDF/OWL ontology repo |

All repos use `stage` branch for staging work before merging to `main`.

## Deployment

Amplify Hosting with branch-to-environment mapping:
- `main` → production (`modeler.digitalhome.cloud`)
- `stage` → staging

Build spec is in `amplify.yml`. The build runs `npm run build` and deploys `public/`.
