import * as React from "react";
import OntologyGraph from "./OntologyGraph";
import OntologySidebar from "./OntologySidebar";
import OntologyInspector from "./OntologyInspector";
import graphData from "../data/ontology-graph.json";

const DEFAULT_HEIGHT = 900;
const HEIGHT_STEP = 100;
const MIN_HEIGHT = 400;
const MAX_HEIGHT = 1400;

const WorkspaceShell = () => {
  const [selectedNode, setSelectedNode] = React.useState(null);
  const [activeView, setActiveView] = React.useState(null);
  const [canvasHeight, setCanvasHeight] = React.useState(DEFAULT_HEIGHT);

  const shrink = () => setCanvasHeight((h) => Math.max(MIN_HEIGHT, h - HEIGHT_STEP));
  const grow = () => setCanvasHeight((h) => Math.min(MAX_HEIGHT, h + HEIGHT_STEP));

  return (
    <div className="dhc-workspace dhc-workspace--three-columns">
      <OntologySidebar
        graphData={graphData}
        activeView={activeView}
        onViewChange={setActiveView}
        onNodeSelect={setSelectedNode}
        selectedNode={selectedNode}
      />
      <div className="dhc-graph-panel">
        <div className="dhc-canvas-controls">
          <button onClick={shrink} title="Shrink canvas">&minus;</button>
          <span>{canvasHeight}px</span>
          <button onClick={grow} title="Grow canvas">+</button>
        </div>
        <OntologyGraph
          graphData={graphData}
          activeView={activeView}
          onNodeClick={setSelectedNode}
          selectedNode={selectedNode}
          canvasHeight={canvasHeight}
        />
      </div>
      <OntologyInspector graphData={graphData} selectedNode={selectedNode} />
    </div>
  );
};

export default WorkspaceShell;
