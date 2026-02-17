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

## Ecosystem

Part of the DigitalHome.Cloud platform:

| App | URL |
|-----|-----|
| Portal | [portal.digitalhome.cloud](https://portal.digitalhome.cloud) |
| Designer | [designer.digitalhome.cloud](https://designer.digitalhome.cloud) |
| **Modeler** | [modeler.digitalhome.cloud](https://modeler.digitalhome.cloud) |

## License

[0BSD](LICENSE)
