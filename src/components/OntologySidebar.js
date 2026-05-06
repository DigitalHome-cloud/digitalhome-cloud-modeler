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
  energy: "#eab308",
  compliance: "#a16207",
};

const VIEW_LABELS = {
  spatial: "Spatial",
  building: "Building",
  electrical: "Electrical",
  plumbing: "Plumbing",
  heating: "Heating / HVAC",
  network: "Network",
  governance: "Governance",
  automation: "Automation",
  energy: "Energy",
  compliance: "Compliance",
};

const VIEW_ORDER = [
  "spatial",
  "building",
  "electrical",
  "plumbing",
  "heating",
  "network",
  "governance",
  "automation",
];

const OntologySidebar = ({
  graphData,
  visibleViews,
  onToggleView,
  onShowAll,
  onHideAll,
  showProperties,
  onToggleProperties,
  onNodeSelect,
  selectedNode,
}) => {
  const { i18n } = useTranslation();
  const lang = i18n.language || "en";
  const [expanded, setExpanded] = React.useState({});

  // Group class nodes by designView; enum instances are nested under their class.
  const grouped = React.useMemo(() => {
    if (!graphData) return {};
    const groups = {};
    const enumsByClass = {};

    for (const node of graphData.nodes) {
      if (node.type === "enumInstance") {
        const ofClass = node.ofClass;
        if (!enumsByClass[ofClass]) enumsByClass[ofClass] = [];
        enumsByClass[ofClass].push(node);
      }
    }

    for (const node of graphData.nodes) {
      if (node.type !== "class") continue;
      const view = node.designView || "shared";
      if (!groups[view]) groups[view] = { classes: [] };
      groups[view].classes.push({
        ...node,
        enumInstances: enumsByClass[node.id] || [],
      });
    }

    return groups;
  }, [graphData]);

  const toggleExpanded = (view) => {
    setExpanded((prev) => ({ ...prev, [view]: !prev[view] }));
  };

  const expandAll = () => {
    const next = {};
    for (const v of [...VIEW_ORDER, "shared"]) next[v] = true;
    setExpanded(next);
  };

  const collapseAll = () => {
    const next = {};
    for (const v of [...VIEW_ORDER, "shared"]) next[v] = false;
    setExpanded(next);
  };

  return (
    <div className="dhc-sidebar">
      {graphData?.version && (
        <div className="dhc-sidebar-version">
          Ontology v{graphData.version}
        </div>
      )}
      <div className="dhc-sidebar-header">
        <span className="dhc-sidebar-title">Design Views</span>
        <div className="dhc-sidebar-header-actions">
          <button className="dhc-sidebar-clear" onClick={onShowAll} title="Show all views">
            All
          </button>
          <button className="dhc-sidebar-clear" onClick={onHideAll} title="Hide all views">
            None
          </button>
        </div>
      </div>
      <div className="dhc-sidebar-controls">
        <label className="dhc-sidebar-toggle">
          <input
            type="checkbox"
            checked={showProperties}
            onChange={onToggleProperties}
          />
          <span>Show Property Edges</span>
        </label>
        <div className="dhc-sidebar-controls-row">
          <button className="dhc-sidebar-clear" onClick={expandAll} title="Expand all sections">
            Expand
          </button>
          <button className="dhc-sidebar-clear" onClick={collapseAll} title="Collapse all sections">
            Collapse
          </button>
        </div>
      </div>
      <div className="dhc-sidebar-body">
        {[...VIEW_ORDER, "shared"].map((view) => {
          const group = grouped[view];
          if (!group || group.classes.length === 0) return null;
          const isExpanded = expanded[view] !== false; // default open
          const isVisible = view === "shared" ? true : visibleViews.has(view);

          return (
            <div key={view} className="dhc-sidebar-section">
              <div
                className={`dhc-sidebar-section-header ${isVisible ? "dhc-sidebar-section-header--active" : ""}`}
              >
                {view !== "shared" && (
                  <input
                    type="checkbox"
                    className="dhc-sidebar-checkbox"
                    checked={isVisible}
                    onChange={() => onToggleView(view)}
                    title={`Toggle ${VIEW_LABELS[view]}`}
                  />
                )}
                <button
                  className="dhc-sidebar-section-btn"
                  onClick={() => toggleExpanded(view)}
                >
                  <span
                    className="dhc-view-dot"
                    style={{ background: VIEW_COLORS[view] || "#e5e7eb" }}
                  />
                  <span className="dhc-sidebar-section-label">
                    {VIEW_LABELS[view] || "Shared"}
                  </span>
                  <span className="dhc-sidebar-section-count">
                    {group.classes.length}
                  </span>
                  <span className={`dhc-sidebar-chevron ${isExpanded ? "dhc-sidebar-chevron--open" : ""}`}>
                    &#9654;
                  </span>
                </button>
              </div>
              {isExpanded && (
                <div className="dhc-sidebar-items">
                  {group.classes.map((node) => (
                    <React.Fragment key={node.id}>
                      <button
                        className={`dhc-sidebar-item ${selectedNode === node.id ? "dhc-sidebar-item--selected" : ""}`}
                        onClick={() => onNodeSelect(node.id)}
                      >
                        <span className="dhc-sidebar-item-icon">C</span>
                        {pickLabel(node.label, lang) || node.id}
                        {node.governedByNorms?.length > 0 && (
                          <span className="dhc-sidebar-item-badge" title={node.governedByNorms.join(", ")}>
                            {node.governedByNorms.length}
                          </span>
                        )}
                      </button>
                      {node.enumInstances.map((inst) => (
                        <button
                          key={inst.id}
                          className={`dhc-sidebar-item dhc-sidebar-item--enum ${selectedNode === inst.id ? "dhc-sidebar-item--selected" : ""}`}
                          onClick={() => onNodeSelect(inst.id)}
                        >
                          <span className="dhc-sidebar-item-icon">E</span>
                          {pickLabel(inst.label, lang) || inst.id}
                        </button>
                      ))}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OntologySidebar;
