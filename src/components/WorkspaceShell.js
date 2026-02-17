import * as React from "react";
import OntologyGraph from "./OntologyGraph";
import OntologySidebar from "./OntologySidebar";
import OntologyInspector from "./OntologyInspector";
import graphData from "../data/ontology-graph.json";

const WorkspaceShell = () => {
  const [selectedNode, setSelectedNode] = React.useState(null);
  const [activeView, setActiveView] = React.useState(null);

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
        <OntologyGraph
          graphData={graphData}
          activeView={activeView}
          onNodeClick={setSelectedNode}
          selectedNode={selectedNode}
        />
      </div>
      <OntologyInspector graphData={graphData} selectedNode={selectedNode} />
    </div>
  );
};

export default WorkspaceShell;
