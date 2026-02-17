import * as React from "react";

const VIEW_COLORS = {
  spatial: "#22c55e",
  building: "#f59e0b",
  electrical: "#3b82f6",
  plumbing: "#06b6d4",
  heating: "#ef4444",
  network: "#a855f7",
  automation: "#ec4899",
};
const DEFAULT_COLOR = "#e5e7eb";

const OntologyGraph = ({ graphData, activeView, onNodeClick, selectedNode }) => {
  const containerRef = React.useRef(null);
  const graphRef = React.useRef(null);
  const ForceGraph3DRef = React.useRef(null);
  const [ready, setReady] = React.useState(false);
  const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 });

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

  // Track container size with ResizeObserver
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof window === "undefined") return;

    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      setDimensions((prev) => {
        if (prev.width === Math.floor(width) && prev.height === Math.floor(height)) return prev;
        return { width: Math.floor(width), height: Math.floor(height) };
      });
    };

    measure();

    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    } else {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
  }, []);

  // Filter/dim nodes based on activeView
  const processedData = React.useMemo(() => {
    if (!graphData) return { nodes: [], links: [] };

    const nodes = graphData.nodes.map((n) => ({
      ...n,
      _color: VIEW_COLORS[n.view] || DEFAULT_COLOR,
      _dimmed: activeView && n.view !== activeView,
      _size: n.type === "class" ? 6 : 3,
    }));

    const nodeIds = new Set(nodes.map((n) => n.id));
    const links = graphData.links.filter(
      (l) => nodeIds.has(l.source?.id || l.source) && nodeIds.has(l.target?.id || l.target)
    ).map((l) => ({
      ...l,
      _dimmed: activeView && (() => {
        const srcNode = graphData.nodes.find((n) => n.id === (l.source?.id || l.source));
        const tgtNode = graphData.nodes.find((n) => n.id === (l.target?.id || l.target));
        return srcNode?.view !== activeView && tgtNode?.view !== activeView;
      })(),
    }));

    return { nodes, links };
  }, [graphData, activeView]);

  // Camera focus on selected node
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
      <div ref={containerRef} className="dhc-graph-container">
        <div className="dhc-graph-loading">
          <span>Initializing 3D engine...</span>
        </div>
      </div>
    );
  }

  const ForceGraph3D = ForceGraph3DRef.current;

  return (
    <div ref={containerRef} className="dhc-graph-container">
      {dimensions.width > 0 && dimensions.height > 0 && (
        <ForceGraph3D
          ref={graphRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={processedData}
          backgroundColor="#020617"
          nodeLabel={(node) => `${node.label} (${node.type})`}
          nodeColor={(node) =>
            node._dimmed ? `${node._color}33` : node._color
          }
          nodeVal={(node) => (node._dimmed ? node._size * 0.5 : node._size)}
          nodeOpacity={0.9}
          nodeResolution={16}
          linkColor={(link) =>
            link.type === "subClassOf"
              ? link._dimmed ? "#64748b33" : "#64748b"
              : link._dimmed ? "#38bdf833" : "#38bdf8"
          }
          linkWidth={(link) => (link.type === "subClassOf" ? 1.5 : 0.8)}
          linkOpacity={0.6}
          linkDirectionalParticles={2}
          linkDirectionalParticleWidth={1.5}
          linkDirectionalParticleSpeed={0.005}
          linkDirectionalParticleColor={(link) =>
            link.type === "subClassOf" ? "#94a3b8" : "#38bdf8"
          }
          linkLabel={(link) => link.label}
          onNodeClick={(node) => {
            if (onNodeClick) onNodeClick(node.id);
          }}
          onNodeRightClick={(node, event) => {
            event.preventDefault();
            if (graphRef.current) {
              graphRef.current.zoomToFit(400, 50);
            }
          }}
          nodeThreeObjectExtend={true}
          nodeThreeObject={(node) => {
            if (typeof window === "undefined") return null;
            const THREE = require("three");
            const sprite = new THREE.Sprite(
              new THREE.SpriteMaterial({
                map: createTextTexture(node.label, node._color, node._dimmed),
                transparent: true,
                depthWrite: false,
              })
            );
            sprite.scale.set(24, 6, 1);
            sprite.position.set(0, 8, 0);
            return sprite;
          }}
          warmupTicks={50}
          cooldownTime={3000}
        />
      )}
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
