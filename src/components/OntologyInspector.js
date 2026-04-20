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

const TYPE_LABELS = {
  class: "Class",
  enumInstance: "Enum Instance",
};

const OntologyInspector = ({ graphData, selectedNode }) => {
  const { i18n } = useTranslation();
  const lang = i18n.language || "en";

  const node = React.useMemo(() => {
    if (!selectedNode || !graphData) return null;
    return graphData.nodes.find((n) => n.id === selectedNode);
  }, [selectedNode, graphData]);

  const incoming = React.useMemo(() => {
    if (!node || !graphData) return [];
    return graphData.links.filter(
      (l) => (l.target?.id || l.target) === node.id
    );
  }, [node, graphData]);

  const outgoing = React.useMemo(() => {
    if (!node || !graphData) return [];
    return graphData.links.filter(
      (l) => (l.source?.id || l.source) === node.id
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

  const viewColor = VIEW_COLORS[node.designView] || "#e5e7eb";
  const labelText = pickLabel(node.label, lang) || node.id;

  return (
    <div className="dhc-panel dhc-panel--inspector">
      <div className="dhc-panel-header">
        <span className="dhc-panel-title">Inspector</span>
        <span className="dhc-panel-tag">{TYPE_LABELS[node.type] || node.type}</span>
      </div>
      <div className="dhc-panel-body">
        <div className="dhc-inspector-field">
          <div className="dhc-inspector-label">Label</div>
          <div className="dhc-inspector-value">{labelText}</div>
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

        {node.designView && (
          <div className="dhc-inspector-field">
            <div className="dhc-inspector-label">Design View</div>
            <div className="dhc-inspector-value">
              <span className="dhc-view-dot" style={{ background: viewColor }} />
              {node.designView}
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

        {node.ofClass && (
          <div className="dhc-inspector-field">
            <div className="dhc-inspector-label">Member of</div>
            <div className="dhc-inspector-value dhc-inspector-value--mono">
              {node.ofClass}
            </div>
          </div>
        )}

        {node.governedByNorms?.length > 0 && (
          <div className="dhc-inspector-field">
            <div className="dhc-inspector-label">Governed by Norms</div>
            <div className="dhc-inspector-list">
              {node.governedByNorms.map((norm) => (
                <div key={norm} className="dhc-inspector-list-item">
                  <span className="dhc-inspector-list-icon">N</span>
                  {norm}
                </div>
              ))}
            </div>
          </div>
        )}

        {outgoing.length > 0 && (
          <div className="dhc-inspector-field">
            <div className="dhc-inspector-label">
              Outgoing ({outgoing.length})
            </div>
            <div className="dhc-inspector-list">
              {outgoing.map((l, i) => (
                <div key={`out-${i}`} className="dhc-inspector-list-item">
                  <span className="dhc-inspector-list-arrow">&rarr;</span>
                  <span className="dhc-inspector-list-prop">{l.property}</span>
                  <span className="dhc-inspector-list-target">
                    {l.target?.id || l.target}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {incoming.length > 0 && (
          <div className="dhc-inspector-field">
            <div className="dhc-inspector-label">
              Incoming ({incoming.length})
            </div>
            <div className="dhc-inspector-list">
              {incoming.map((l, i) => (
                <div key={`in-${i}`} className="dhc-inspector-list-item">
                  <span className="dhc-inspector-list-arrow">&larr;</span>
                  <span className="dhc-inspector-list-prop">{l.property}</span>
                  <span className="dhc-inspector-list-target">
                    {l.source?.id || l.source}
                  </span>
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
