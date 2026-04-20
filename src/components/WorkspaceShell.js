import * as React from "react";
import OntologyGraph from "./OntologyGraph";
import OntologySidebar from "./OntologySidebar";
import OntologyInspector from "./OntologyInspector";
import { useOntology } from "../context/OntologyContext";
import { useTranslation } from "gatsby-plugin-react-i18next";
import { Link } from "gatsby";

const ALL_VIEWS = new Set([
  "spatial", "building", "electrical", "plumbing", "heating", "network", "governance", "automation",
]);

const WorkspaceShell = () => {
  const { t } = useTranslation();
  const { fetchState, ontologyGraph } = useOntology();
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

  if (fetchState !== "ready" || !ontologyGraph) {
    return (
      <div className="dhc-workspace dhc-workspace--empty">
        <div className="dhc-workspace-banner">
          <span>{t("builder.noData")}</span>
          <Link to="/config/" className="dhc-btn dhc-btn--sm dhc-btn--primary">
            {t("nav.config")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="dhc-workspace dhc-workspace--three-columns">
      <OntologySidebar
        graphData={ontologyGraph}
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
          graphData={ontologyGraph}
          showProperties={showProperties}
          visibleViews={visibleViews}
          onNodeClick={setSelectedNode}
          selectedNode={selectedNode}
        />
      </div>
      <OntologyInspector graphData={ontologyGraph} selectedNode={selectedNode} />
    </div>
  );
};

export default WorkspaceShell;
