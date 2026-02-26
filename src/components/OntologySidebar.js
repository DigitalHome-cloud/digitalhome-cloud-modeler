import * as React from "react";

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

const VIEW_LABELS = {
  spatial: "Spatial",
  building: "Building",
  electrical: "Electrical",
  plumbing: "Plumbing",
  heating: "Heating / HVAC",
  network: "Network",
  governance: "Governance",
  automation: "Automation",
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
  meta,
  visibleViews,
  onToggleView,
  onShowAll,
  onHideAll,
  showProperties,
  onToggleProperties,
  onNodeSelect,
  selectedNode,
}) => {
  const [expanded, setExpanded] = React.useState({});

  // Group nodes by view
  const grouped = React.useMemo(() => {
    if (!graphData) return {};
    const groups = {};
    for (const node of graphData.nodes) {
      const view = node.view || "shared";
      if (!groups[view]) groups[view] = { classes: [], properties: [] };
      if (node.type === "class") {
        groups[view].classes.push(node);
      } else {
        groups[view].properties.push(node);
      }
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
      {meta?.version && (
        <div className="dhc-sidebar-version">
          Ontology v{meta.version}
        </div>
      )}
      <div className="dhc-sidebar-header">
        <span className="dhc-sidebar-title">Design Views</span>
        <div className="dhc-sidebar-header-actions">
          <button
            className="dhc-sidebar-clear"
            onClick={onShowAll}
            title="Show all views"
          >
            All
          </button>
          <button
            className="dhc-sidebar-clear"
            onClick={onHideAll}
            title="Hide all views"
          >
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
          <span>Show Properties</span>
        </label>
        <div className="dhc-sidebar-controls-row">
          <button
            className="dhc-sidebar-clear"
            onClick={expandAll}
            title="Expand all sections"
          >
            Expand
          </button>
          <button
            className="dhc-sidebar-clear"
            onClick={collapseAll}
            title="Collapse all sections"
          >
            Collapse
          </button>
        </div>
      </div>
      <div className="dhc-sidebar-body">
        {VIEW_ORDER.map((view) => {
          const group = grouped[view];
          if (!group) return null;
          const isExpanded = expanded[view] !== false; // default open
          const isVisible = visibleViews.has(view);

          return (
            <div key={view} className="dhc-sidebar-section">
              <div
                className={`dhc-sidebar-section-header ${isVisible ? "dhc-sidebar-section-header--active" : ""}`}
              >
                <input
                  type="checkbox"
                  className="dhc-sidebar-checkbox"
                  checked={isVisible}
                  onChange={() => onToggleView(view)}
                  title={`Toggle ${VIEW_LABELS[view]}`}
                />
                <button
                  className="dhc-sidebar-section-btn"
                  onClick={() => toggleExpanded(view)}
                >
                  <span
                    className="dhc-view-dot"
                    style={{ background: VIEW_COLORS[view] }}
                  />
                  <span className="dhc-sidebar-section-label">
                    {VIEW_LABELS[view]}
                  </span>
                  <span className="dhc-sidebar-section-count">
                    {group.classes.length + group.properties.length}
                  </span>
                  <span className={`dhc-sidebar-chevron ${isExpanded ? "dhc-sidebar-chevron--open" : ""}`}>
                    &#9654;
                  </span>
                </button>
              </div>
              {isExpanded && (
                <div className="dhc-sidebar-items">
                  {group.classes.length > 0 && (
                    <>
                      <div className="dhc-sidebar-group-label">Classes</div>
                      {group.classes.map((node) => (
                        <button
                          key={node.id}
                          className={`dhc-sidebar-item ${selectedNode === node.id ? "dhc-sidebar-item--selected" : ""}`}
                          onClick={() => onNodeSelect(node.id)}
                        >
                          <span className="dhc-sidebar-item-icon">C</span>
                          {node.label}
                        </button>
                      ))}
                    </>
                  )}
                  {group.properties.length > 0 && (
                    <>
                      <div className="dhc-sidebar-group-label">Properties</div>
                      {group.properties.map((node) => (
                        <button
                          key={node.id}
                          className={`dhc-sidebar-item dhc-sidebar-item--prop ${selectedNode === node.id ? "dhc-sidebar-item--selected" : ""}`}
                          onClick={() => onNodeSelect(node.id)}
                        >
                          <span className="dhc-sidebar-item-icon">
                            {node.type === "objectProperty" ? "O" : "D"}
                          </span>
                          {node.label}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Shared (no view) */}
        {grouped["shared"] && (
          <div className="dhc-sidebar-section">
            <div className="dhc-sidebar-section-header">
              <button
                className="dhc-sidebar-section-btn"
                onClick={() => toggleExpanded("shared")}
              >
                <span
                  className="dhc-view-dot"
                  style={{ background: "#e5e7eb" }}
                />
                <span className="dhc-sidebar-section-label">Shared</span>
                <span className="dhc-sidebar-section-count">
                  {(grouped["shared"].classes?.length || 0) +
                    (grouped["shared"].properties?.length || 0)}
                </span>
                <span className={`dhc-sidebar-chevron ${expanded["shared"] !== false ? "dhc-sidebar-chevron--open" : ""}`}>
                  &#9654;
                </span>
              </button>
            </div>
            {expanded["shared"] !== false && (
              <div className="dhc-sidebar-items">
                {grouped["shared"].classes.map((node) => (
                  <button
                    key={node.id}
                    className={`dhc-sidebar-item ${selectedNode === node.id ? "dhc-sidebar-item--selected" : ""}`}
                    onClick={() => onNodeSelect(node.id)}
                  >
                    <span className="dhc-sidebar-item-icon">C</span>
                    {node.label}
                  </button>
                ))}
                {grouped["shared"].properties.map((node) => (
                  <button
                    key={node.id}
                    className={`dhc-sidebar-item dhc-sidebar-item--prop ${selectedNode === node.id ? "dhc-sidebar-item--selected" : ""}`}
                    onClick={() => onNodeSelect(node.id)}
                  >
                    <span className="dhc-sidebar-item-icon">
                      {node.type === "objectProperty" ? "O" : "D"}
                    </span>
                    {node.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OntologySidebar;
