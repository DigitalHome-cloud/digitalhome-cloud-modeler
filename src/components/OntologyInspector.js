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

const TYPE_LABELS = {
  class: "Class",
  objectProperty: "Object Property",
  datatypeProperty: "Datatype Property",
};

const OntologyInspector = ({ graphData, selectedNode }) => {
  const node = React.useMemo(() => {
    if (!selectedNode || !graphData) return null;
    return graphData.nodes.find((n) => n.id === selectedNode);
  }, [selectedNode, graphData]);

  const relatedProperties = React.useMemo(() => {
    if (!node || node.type !== "class" || !graphData) return [];
    return graphData.nodes.filter(
      (n) =>
        (n.type === "objectProperty" || n.type === "datatypeProperty") &&
        (n.domain === node.id || n.range === node.id)
    );
  }, [node, graphData]);

  const relatedLinks = React.useMemo(() => {
    if (!node || !graphData) return [];
    return graphData.links.filter(
      (l) =>
        (l.source?.id || l.source) === node.id ||
        (l.target?.id || l.target) === node.id
    );
  }, [node, graphData]);

  if (!node) {
    return (
      <div className="dhc-panel dhc-panel--inspector">
        <div className="dhc-panel-header">
          <span className="dhc-panel-title">Inspector</span>
          <span className="dhc-panel-tag">Details</span>
        </div>
        <div className="dhc-panel-body">
          <p className="dhc-panel-help">
            Click a node in the graph or sidebar to view its details.
          </p>
        </div>
      </div>
    );
  }

  const viewColor = VIEW_COLORS[node.view] || "#e5e7eb";

  return (
    <div className="dhc-panel dhc-panel--inspector">
      <div className="dhc-panel-header">
        <span className="dhc-panel-title">Inspector</span>
        <span className="dhc-panel-tag">{TYPE_LABELS[node.type] || node.type}</span>
      </div>
      <div className="dhc-panel-body">
        <div className="dhc-inspector-field">
          <div className="dhc-inspector-label">Label</div>
          <div className="dhc-inspector-value">{node.label}</div>
        </div>

        <div className="dhc-inspector-field">
          <div className="dhc-inspector-label">IRI</div>
          <div className="dhc-inspector-value dhc-inspector-value--mono">
            {node.id}
          </div>
        </div>

        <div className="dhc-inspector-field">
          <div className="dhc-inspector-label">Type</div>
          <div className="dhc-inspector-value">
            {TYPE_LABELS[node.type] || node.type}
          </div>
        </div>

        {node.view && (
          <div className="dhc-inspector-field">
            <div className="dhc-inspector-label">Design View</div>
            <div className="dhc-inspector-value">
              <span className="dhc-view-dot" style={{ background: viewColor }} />
              {node.view}
            </div>
          </div>
        )}

        {node.comment && (
          <div className="dhc-inspector-field">
            <div className="dhc-inspector-label">Description</div>
            <div className="dhc-inspector-value dhc-inspector-value--comment">
              {node.comment}
            </div>
          </div>
        )}

        {node.superClass && (
          <div className="dhc-inspector-field">
            <div className="dhc-inspector-label">Superclass</div>
            <div className="dhc-inspector-value dhc-inspector-value--mono">
              {node.superClass}
            </div>
          </div>
        )}

        {node.domain && (
          <div className="dhc-inspector-field">
            <div className="dhc-inspector-label">Domain</div>
            <div className="dhc-inspector-value dhc-inspector-value--mono">
              {node.domain}
            </div>
          </div>
        )}

        {node.range && (
          <div className="dhc-inspector-field">
            <div className="dhc-inspector-label">Range</div>
            <div className="dhc-inspector-value dhc-inspector-value--mono">
              {node.range}
            </div>
          </div>
        )}

        {relatedProperties.length > 0 && (
          <div className="dhc-inspector-field">
            <div className="dhc-inspector-label">
              Related Properties ({relatedProperties.length})
            </div>
            <div className="dhc-inspector-list">
              {relatedProperties.map((p) => (
                <div key={p.id} className="dhc-inspector-list-item">
                  <span className="dhc-inspector-list-icon">
                    {p.type === "objectProperty" ? "O" : "D"}
                  </span>
                  {p.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {relatedLinks.length > 0 && (
          <div className="dhc-inspector-field">
            <div className="dhc-inspector-label">
              Connections ({relatedLinks.length})
            </div>
            <div className="dhc-inspector-list">
              {relatedLinks.map((l, i) => (
                <div key={i} className="dhc-inspector-list-item">
                  <span className="dhc-inspector-list-arrow">
                    {(l.source?.id || l.source) === node.id ? "\u2192" : "\u2190"}
                  </span>
                  {l.label}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OntologyInspector;
