import * as React from "react";
import { useTranslation } from "gatsby-plugin-react-i18next";
import { pickLabel } from "../utils/i18nLabel";

const VIEW_COLORS = {
  spatial: "#22c55e",
  building: "#f59e0b",
  electrical: "#3b82f6",
  plumbing: "#06b6d4",
  heating: "#ef4444",
  network: "#a855f7",
  governance: "#f97316",
  automation: "#ec4899",
};
const DEFAULT_COLOR = "#e5e7eb";

const SUBCLASS_STYLE = {
  color: "#64748b",
  width: 1.5,
  particles: 2,
  particleColor: "#94a3b8",
  dash: null,
};
const OBJECT_STYLE = {
  color: "#38bdf8",
  width: 1.2,
  particles: 2,
  particleColor: "#38bdf8",
  dash: null,
};
const ENUM_STYLE = {
  color: "#a3a3a344",
  width: 0.6,
  particles: 0,
  particleColor: null,
  dash: [2, 2],
};

function linkStyle(link) {
  if (link.property === "rdfs:subClassOf") return SUBCLASS_STYLE;
  return OBJECT_STYLE;
}

const OntologyGraph = ({ graphData, showProperties, visibleViews, onNodeClick, selectedNode }) => {
  const { i18n } = useTranslation();
  const lang = i18n.language || "en";
  const containerRef = React.useRef(null);
  const graphRef = React.useRef(null);
  const ForceGraph3DRef = React.useRef(null);
  const [ready, setReady] = React.useState(false);

  // Dynamic import for SSR safety
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    import("react-force-graph-3d").then((mod) => {
      if (!cancelled) {
        ForceGraph3DRef.current = mod.default;
        setReady(true);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const processedData = React.useMemo(() => {
    if (!graphData) return { nodes: [], links: [] };

    const nodes = graphData.nodes
      .filter((n) => {
        if (n.type === "class") {
          return !visibleViews || !n.designView || visibleViews.has(n.designView);
        }
        // Enum instances follow the visibility of the class they belong to.
        if (n.type === "enumInstance") {
          const parent = graphData.nodes.find((x) => x.id === n.ofClass);
          return !parent || !parent.designView || !visibleViews || visibleViews.has(parent.designView);
        }
        return true;
      })
      .map((n) => ({
        ...n,
        _label: pickLabel(n.label, lang) || n.id,
        _color: n.type === "class"
          ? VIEW_COLORS[n.designView] || DEFAULT_COLOR
          : "#a3a3a3",
        _size: n.type === "class" ? 8 : 4,
      }));

    const nodeIds = new Set(nodes.map((n) => n.id));
    const links = graphData.links
      .filter((l) => {
        const src = l.source?.id || l.source;
        const tgt = l.target?.id || l.target;
        if (!nodeIds.has(src) || !nodeIds.has(tgt)) return false;
        // Subclass links always render; ObjectProperty links toggle via showProperties.
        if (l.property !== "rdfs:subClassOf" && !showProperties) return false;
        return true;
      })
      .map((l) => ({
        ...l,
        _label: pickLabel(l.label, lang) || l.property,
      }));

    return { nodes, links };
  }, [graphData, showProperties, visibleViews, lang]);

  React.useEffect(() => {
    if (!selectedNode || !graphRef.current) return;
    const node = processedData.nodes.find((n) => n.id === selectedNode);
    if (node && node.x !== undefined) {
      graphRef.current.cameraPosition(
        { x: node.x + 80, y: node.y + 40, z: node.z + 80 },
        { x: node.x, y: node.y, z: node.z },
        1000
      );
    }
  }, [selectedNode, processedData.nodes]);

  if (!ready || !ForceGraph3DRef.current) {
    return (
      <div className="dhc-graph-loading">
        <span>Initializing 3D engine...</span>
      </div>
    );
  }

  const ForceGraph3D = ForceGraph3DRef.current;

  return (
    <div ref={containerRef} className="dhc-graph-container">
      <ForceGraph3D
        ref={graphRef}
        graphData={processedData}
        backgroundColor="#020617"
        nodeLabel={(node) => `${node._label} (${node.type})`}
        nodeVal={(node) => node._size}
        nodeColor={() => "#000000"}
        nodeOpacity={0}
        nodeResolution={16}
        linkColor={(link) => linkStyle(link).color}
        linkWidth={(link) => linkStyle(link).width}
        linkOpacity={0.6}
        linkLineDash={(link) => linkStyle(link).dash}
        linkDirectionalParticles={(link) => linkStyle(link).particles}
        linkDirectionalParticleWidth={1.5}
        linkDirectionalParticleSpeed={0.005}
        linkDirectionalParticleColor={(link) => linkStyle(link).particleColor}
        linkLabel={(link) => link._label}
        onNodeClick={(node) => {
          if (onNodeClick) onNodeClick(node.id);
        }}
        onNodeRightClick={(node, event) => {
          event.preventDefault();
          if (graphRef.current) {
            graphRef.current.zoomToFit(400, 50);
          }
        }}
        nodeThreeObjectExtend={false}
        nodeThreeObject={(node) => {
          if (typeof window === "undefined") return null;
          const THREE = require("three");

          const geometry = node.type === "class"
            ? new THREE.SphereGeometry(5, 16, 16)
            : new THREE.BoxGeometry(4, 4, 4);

          const material = new THREE.MeshLambertMaterial({
            color: node._color,
            transparent: true,
            opacity: 0.9,
          });
          const mesh = new THREE.Mesh(geometry, material);

          const sprite = new THREE.Sprite(
            new THREE.SpriteMaterial({
              map: createTextTexture(node._label, node._color, false),
              transparent: true,
              depthWrite: false,
            })
          );
          sprite.scale.set(24, 6, 1);
          sprite.position.set(0, 8, 0);

          const group = new THREE.Group();
          group.add(mesh);
          group.add(sprite);
          return group;
        }}
        warmupTicks={50}
        cooldownTime={3000}
      />
    </div>
  );
};

function createTextTexture(text, color, dimmed) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = 256;
  canvas.height = 64;

  ctx.fillStyle = "transparent";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.font = "bold 24px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = dimmed ? `${color}66` : color;
  ctx.fillText(text, 128, 32);

  const THREE = require("three");
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export default OntologyGraph;
