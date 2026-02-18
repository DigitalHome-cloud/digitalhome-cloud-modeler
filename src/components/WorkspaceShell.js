import * as React from "react";
import OntologyGraph from "./OntologyGraph";
import OntologySidebar from "./OntologySidebar";
import OntologyInspector from "./OntologyInspector";
import graphData from "../data/ontology-graph.json";

const ALL_VIEWS = new Set([
  "spatial", "building", "electrical", "plumbing", "heating", "network", "governance", "automation",
]);

const WorkspaceShell = () => {
  const [selectedNode, setSelectedNode] = React.useState(null);
  const [showProperties, setShowProperties] = React.useState(true);
  const [visibleViews, setVisibleViews] = React.useState(new Set(ALL_VIEWS));

  const toggleView = (view) => {
    setVisibleViews((prev) => {
      const next = new Set(prev);
      if (next.has(view)) {
        next.delete(view);
      } else {
        next.add(view);
      }
      return next;
    });
  };

  const showAllViews = () => setVisibleViews(new Set(ALL_VIEWS));
  const hideAllViews = () => setVisibleViews(new Set());

  return (
    <div className="dhc-workspace dhc-workspace--three-columns">
      <OntologySidebar
        graphData={graphData}
        visibleViews={visibleViews}
        onToggleView={toggleView}
        onShowAll={showAllViews}
        onHideAll={hideAllViews}
        showProperties={showProperties}
        onToggleProperties={() => setShowProperties((p) => !p)}
        onNodeSelect={setSelectedNode}
        selectedNode={selectedNode}
      />
      <div className="dhc-graph-panel">
        <OntologyGraph
          graphData={graphData}
          showProperties={showProperties}
          visibleViews={visibleViews}
          onNodeClick={setSelectedNode}
          selectedNode={selectedNode}
        />
      </div>
      <OntologyInspector graphData={graphData} selectedNode={selectedNode} />
    </div>
  );
};

export default WorkspaceShell;
