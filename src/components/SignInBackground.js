import * as React from "react";

const ONT = {
  brick: {
    color: "#f59e0b",
    label: "brick:",
    prefix: "https://brickschema.org/schema/Brick#",
    classes: [
      "Building",
      "Floor",
      "Room",
      "HVAC_Zone",
      "Air_Handling_Unit",
      "VAV",
      "Chiller",
      "Boiler",
      "Sensor",
      "Setpoint",
      "Temperature_Sensor",
      "CO2_Sensor",
      "Occupancy_Sensor",
      "Fan",
      "Pump",
      "Valve",
      "Damper",
      "Heat_Exchanger",
      "Lighting_System",
      "Meter",
    ],
  },
  rec: {
    color: "#3b82f6",
    label: "rec:",
    prefix: "https://w3id.org/rec#",
    classes: [
      "BuildingComponent",
      "Space",
      "Storey",
      "Zone",
      "Asset",
      "Apartment",
      "Office",
      "Corridor",
      "Facade",
      "Roof",
      "Foundation",
      "Window",
      "Door",
      "Wall",
      "Column",
      "Beam",
      "Staircase",
      "Parking",
      "Garden",
      "Lobby",
    ],
  },
  s223: {
    color: "#a855f7",
    label: "s223:",
    prefix: "http://data.ashrae.org/standard223#",
    classes: [
      "System",
      "Equipment",
      "Connection",
      "ConnectionPoint",
      "Property",
      "DomainSpace",
      "PhysicalSpace",
      "Sensor",
      "Actuator",
      "Controller",
      "FunctionBlock",
      "Connectable",
      "Medium",
      "Fluid",
      "Air",
      "Water",
      "Electricity",
      "Signal",
      "EnumerationKind",
      "QuantifiableProperty",
    ],
  },
  dhc: {
    color: "#22c55e",
    label: "dhc:",
    prefix: "https://ontology.digitalhome.cloud/dhc#",
    classes: [
      "SmartHome",
      "Room",
      "Device",
      "Service",
      "Automation",
      "Resident",
      "Gateway",
      "SensorNode",
      "EnergyMeter",
      "Tariff",
      "Comfort",
      "Schedule",
      "Notification",
      "Integration",
      "Scene",
      "DigitalTwin",
      "HomeGraph",
      "OntologyModule",
      "Mapping",
      "Adapter",
    ],
  },
};

const CLUSTERS = {
  brick: { cx: 260, cy: 480, rings: [1, 6, 13] },
  rec: { cx: 1180, cy: 440, rings: [1, 6, 13] },
  s223: { cx: 850, cy: 200, rings: [1, 5, 14] },
  dhc: { cx: 620, cy: 680, rings: [1, 5, 14] },
};

const BRIDGES = [
  { x: 500, y: 350, c: "#06b6d4", r: 3 },
  { x: 700, y: 290, c: "#06b6d4", r: 2.5 },
  { x: 740, y: 560, c: "#06b6d4", r: 2.5 },
  { x: 960, y: 350, c: "#06b6d4", r: 3 },
  { x: 1020, y: 580, c: "#06b6d4", r: 2.5 },
  { x: 380, y: 600, c: "#06b6d4", r: 2 },
  { x: 1080, y: 650, c: "#06b6d4", r: 2 },
  { x: 200, y: 220, c: "#06b6d4", r: 2 },
  { x: 1300, y: 650, c: "#06b6d4", r: 2 },
  { x: 450, y: 200, c: "#06b6d4", r: 2 },
];

function hex2rgba(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function buildGraph(w, h) {
  const sx = w / 1440;
  const sy = h / 900;
  const nodes = [];
  const edges = [];

  Object.entries(CLUSTERS).forEach(([key, cfg]) => {
    const ont = ONT[key];
    const cx = cfg.cx * sx;
    const cy = cfg.cy * sy;
    const clusterNodes = [];

    const hub = {
      x: cx,
      y: cy,
      r: 9,
      c: ont.color,
      ring: 0,
      label: ont.label,
      isHub: true,
      ont: key,
    };
    nodes.push(hub);
    clusterNodes.push(nodes.length - 1);

    let classIdx = 0;
    const ringRadii = [0, 55 * sx, 100 * sx, 145 * sx];
    cfg.rings.forEach((count, ri) => {
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 - Math.PI / 2 + ri * 0.25;
        const r = ringRadii[ri + 1];
        const nodeR = ri === 0 ? 5.5 : ri === 1 ? 4 : 2.8;
        const cls = ont.classes[classIdx % ont.classes.length];
        classIdx++;
        const nd = {
          x: cx + r * Math.cos(angle),
          y: cy + r * Math.sin(angle),
          r: nodeR,
          c: ont.color,
          ring: ri + 1,
          label: cls,
          shortLabel: cls.replace(/_/g, " "),
          ont: key,
        };
        nodes.push(nd);
        clusterNodes.push(nodes.length - 1);

        const lower = clusterNodes
          .slice(0, clusterNodes.length - 1)
          .filter((idx) => nodes[idx].ring === ri);
        const targetIdx = lower.length
          ? lower.reduce((best, idx) =>
              Math.hypot(nodes[idx].x - nd.x, nodes[idx].y - nd.y) <
              Math.hypot(nodes[best].x - nd.x, nodes[best].y - nd.y)
                ? idx
                : best
            )
          : clusterNodes[0];
        edges.push([nodes.length - 1, targetIdx]);
      }
    });
  });

  const bridgeNodeIdxs = [];
  BRIDGES.forEach((b) => {
    nodes.push({
      x: b.x * sx,
      y: b.y * sy,
      r: b.r,
      c: b.c,
      ring: -1,
      label: "",
      ont: "bridge",
    });
    bridgeNodeIdxs.push(nodes.length - 1);
  });

  const hubIdxs = {};
  nodes.forEach((n, i) => {
    if (n.isHub) hubIdxs[n.ont] = i;
  });
  const backboneLinks = [
    ["brick", "dhc"],
    ["dhc", "s223"],
    ["s223", "rec"],
    ["rec", "brick"],
    ["brick", "s223"],
    ["dhc", "rec"],
  ];
  backboneLinks.forEach(([a, b]) => {
    if (hubIdxs[a] != null && hubIdxs[b] != null) {
      edges.push([hubIdxs[a], hubIdxs[b]]);
    }
  });

  const hubList = Object.entries(hubIdxs);
  bridgeNodeIdxs.forEach((bi) => {
    const bn = nodes[bi];
    const near = hubList.reduce(
      (best, [, hi]) => {
        const d = Math.hypot(nodes[hi].x - bn.x, nodes[hi].y - bn.y);
        return d < best.d ? { hi, d } : best;
      },
      { hi: hubList[0][1], d: Infinity }
    );
    edges.push([bi, near.hi]);
  });

  return { nodes, edges };
}

const SignInBackground = () => {
  const canvasRef = React.useRef(null);

  React.useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const cvs = canvasRef.current;
    if (!cvs) return undefined;
    const ctx = cvs.getContext("2d");

    const reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let W = 0;
    let H = 0;
    let allNodes = [];
    let allEdges = [];
    let rafId = null;
    let startT = null;
    let staticDrawn = false;

    const resize = () => {
      W = cvs.width = window.innerWidth;
      H = cvs.height = window.innerHeight;
      const g = buildGraph(W, H);
      allNodes = g.nodes;
      allEdges = g.edges;
      staticDrawn = false;
      if (reduceMotion) drawStatic();
    };

    const drawStatic = () => {
      // One frame at scanX center of viewport, no animation.
      drawScene(0, W / 2);
      staticDrawn = true;
    };

    const drawScene = (t, scanX) => {
      ctx.clearRect(0, 0, W, H);
      const GLOW = 140;

      allEdges.forEach(([ai, bi]) => {
        const a = allNodes[ai];
        const b = allNodes[bi];
        if (!a || !b) return;
        const midX = (a.x + b.x) / 2;
        const prox = Math.max(0, 1 - Math.abs(midX - scanX) / GLOW);
        const isBackbone = a.isHub && b.isHub;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        if (isBackbone) {
          ctx.strokeStyle = `rgba(14,165,233,${0.08 + 0.3 * prox})`;
          ctx.lineWidth = 1 + prox;
          ctx.setLineDash([6, 6]);
          ctx.lineDashOffset = -t * 10;
        } else {
          ctx.strokeStyle = `rgba(14,165,233,${0.07 + 0.22 * prox})`;
          ctx.lineWidth = 0.8 + prox * 0.5;
          ctx.setLineDash([]);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      });

      const beamG = ctx.createLinearGradient(scanX - 100, 0, scanX + 100, 0);
      beamG.addColorStop(0, "transparent");
      beamG.addColorStop(0.45, "rgba(14,165,233,0.04)");
      beamG.addColorStop(0.5, "rgba(14,165,233,0.09)");
      beamG.addColorStop(0.55, "rgba(14,165,233,0.04)");
      beamG.addColorStop(1, "transparent");
      ctx.fillStyle = beamG;
      ctx.fillRect(scanX - 100, 0, 200, H);

      ctx.beginPath();
      ctx.moveTo(scanX, 0);
      ctx.lineTo(scanX, H);
      ctx.strokeStyle = "rgba(14,165,233,0.3)";
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.stroke();

      allNodes.forEach((n) => {
        const d = Math.abs(n.x - scanX);
        const prox = Math.max(0, 1 - d / GLOW);
        const base = 0.2 + 0.15 * (n.r / 9);

        if (prox > 0.05) {
          const gr = ctx.createRadialGradient(
            n.x,
            n.y,
            0,
            n.x,
            n.y,
            n.r * 3 + prox * 10
          );
          gr.addColorStop(0, hex2rgba(n.c, 0.25 * prox));
          gr.addColorStop(1, "transparent");
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r * 3 + prox * 10, 0, Math.PI * 2);
          ctx.fillStyle = gr;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = hex2rgba(n.c, base + 0.65 * prox);
        ctx.fill();

        if (n.isHub) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r + 3, 0, Math.PI * 2);
          ctx.strokeStyle = hex2rgba(n.c, 0.2 + 0.6 * prox);
          ctx.lineWidth = 1;
          ctx.stroke();

          if (!reduceMotion) {
            const pulseT =
              (t * 0.45 + (allNodes.indexOf(n) / allNodes.length) * 3) % 2;
            if (pulseT < 1.6) {
              const pR = pulseT * 70;
              ctx.beginPath();
              ctx.arc(n.x, n.y, pR, 0, Math.PI * 2);
              ctx.strokeStyle = hex2rgba(n.c, (1 - pulseT / 1.6) * 0.15);
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          }
        }

        if (n.label && prox > 0.08) {
          const alpha = Math.min(1, prox * 2.5);
          const isHub = n.isHub;
          ctx.save();
          ctx.globalAlpha = alpha;

          if (isHub) {
            ctx.font = "600 11px 'SF Mono','Fira Code',Menlo,monospace";
            ctx.fillStyle = n.c;
            ctx.textAlign = "center";
            ctx.fillText(n.label, n.x, n.y - n.r - 8);

            ctx.font = "8px 'SF Mono','Fira Code',Menlo,monospace";
            ctx.fillStyle = hex2rgba(n.c, 0.5);
            ctx.fillText(ONT[n.ont]?.prefix || "", n.x, n.y - n.r - 18);
          } else if (n.ring === 1) {
            const hub = allNodes.find((m) => m.isHub && m.ont === n.ont);
            const angle = Math.atan2(
              n.y - (hub?.y || 0),
              n.x - (hub?.x || 0)
            );
            const lx = n.x + Math.cos(angle) * (n.r + 9);
            const ly = n.y + Math.sin(angle) * (n.r + 9);
            ctx.font = "9px 'SF Mono','Fira Code',Menlo,monospace";
            ctx.fillStyle = hex2rgba(n.c, 0.85);
            ctx.textAlign = lx > n.x ? "left" : "right";
            ctx.fillText(n.shortLabel || n.label, lx, ly + 3);
          } else if (n.ring === 2) {
            const hub = allNodes.find((m) => m.isHub && m.ont === n.ont);
            const angle = Math.atan2(
              n.y - (hub?.y || 0),
              n.x - (hub?.x || 0)
            );
            const lx = n.x + Math.cos(angle) * (n.r + 7);
            const ly = n.y + Math.sin(angle) * (n.r + 7);
            ctx.font = "8px 'SF Mono','Fira Code',Menlo,monospace";
            ctx.fillStyle = hex2rgba(n.c, 0.6);
            ctx.textAlign = lx > n.x ? "left" : "right";
            ctx.fillText(n.shortLabel || n.label, lx, ly + 3);
          }
          ctx.restore();
        }
      });
    };

    const frame = (ts) => {
      if (startT == null) startT = ts;
      const t = (ts - startT) / 1000;
      const PERIOD = 16;
      const rawX = (t % PERIOD) / PERIOD;
      const scanX = rawX * (W + 300) - 150;
      drawScene(t, scanX);
      rafId = window.requestAnimationFrame(frame);
    };

    resize();
    window.addEventListener("resize", resize);

    if (reduceMotion) {
      if (!staticDrawn) drawStatic();
    } else {
      rafId = window.requestAnimationFrame(frame);
    }

    return () => {
      if (rafId != null) window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="dhc-signin-canvas" aria-hidden="true" />;
};

export default SignInBackground;
