# DigitalHome.Cloud Modeler

3D interactive ontology viewer for the [DigitalHome.Cloud](https://digitalhome.cloud) platform. Visualizes the DHC core ontology (`dhc-core.schema.ttl`) as a force-directed 3D graph with ~45 classes and ~25 properties across 7 design views.

## Quick Start

```bash
yarn install
yarn parse-ontology   # generate graph data from TTL schema
yarn develop          # http://localhost:8002
```

## Architecture

Three-panel layout: sidebar (design view navigation) + 3D graph canvas (react-force-graph-3d / Three.js) + inspector (node details).

See [CLAUDE.md](CLAUDE.md) for full architecture documentation.

## Ontology Lifecycle

The core ontology (`dhc-core.schema.ttl`) lives inside this repo under `semantic-core/` (merged from the former `digitalhome-cloud-semantic-core` repo). Ontology changes are **deployments**, not runtime edits — they define the foundational vocabulary for the entire platform.

```
semantic-core/
  ontology/dhc-core.schema.ttl   ← core ontology
  ontology/context.jsonld         ← JSON-LD context for runtime use
  instances/DE-DEMO.ttl           ← demo instance data
  shapes/                         ← SHACL validation shapes
```

1. **Author** — Edit TTL files under `semantic-core/`, version with semantic tags (`model-vX.Y.Z`)
2. **Build-time parse** — `yarn parse-ontology` reads the TTL and generates `src/data/ontology-graph.json`
3. **CI/CD publish** — Pipeline publishes JSON-LD context to versioned S3 paths for runtime use
4. **Deploy** — Amplify Hosting deploys the modeler with the parsed graph data baked in

## Access Model

The modeler is an **expert and admin tool**. The ontology is general domain knowledge (not tenant-specific), so no SmartHome ID is required.

- **DEMO** (no login) — Full read-only 3D graph, browse all design views, inspect node details
- **Authenticated** (future) — Ontology editing and annotation, gated by `dhc-admins` Cognito group

## Ecosystem

Part of the DigitalHome.Cloud platform:

| App | URL |
|-----|-----|
| Portal | [portal.digitalhome.cloud](https://portal.digitalhome.cloud) |
| Designer | [designer.digitalhome.cloud](https://designer.digitalhome.cloud) |
| **Modeler** | [modeler.digitalhome.cloud](https://modeler.digitalhome.cloud) |

## License

[0BSD](LICENSE)
