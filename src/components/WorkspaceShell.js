import * as React from "react";
import { useTranslation } from "gatsby-plugin-react-i18next";
import { initModelerWorkspace, exportWorkspaceJson } from "../blockly/workspace";

const Sidebar = () => {
  const { t } = useTranslation();
  const paletteItems = [
    { label: "Class", tag: "RDFS/OWL" },
    { label: "Object Property", tag: "Relation" },
    { label: "Data Property", tag: "Attribute" },
    { label: "EquipmentType", tag: "DHC" },
  ];

  return (
    <div className="dhc-panel">
      <div className="dhc-panel-header">
        <span className="dhc-panel-title">
          {t("workspace.sidebar.title")}
        </span>
        <span className="dhc-panel-tag">Palette</span>
      </div>
      <div className="dhc-panel-body">
        <p>{t("workspace.sidebar.help")}</p>
        <ul className="dhc-palette-list">
          {paletteItems.map((item) => (
            <li key={item.label} className="dhc-palette-item">
              <span className="dhc-palette-item-label">{item.label}</span>
              <span className="dhc-palette-item-tag">{item.tag}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const Canvas = ({ onSelectionChange }) => {
  const { t } = useTranslation();
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    initModelerWorkspace(containerRef.current, { onSelectionChange });
  }, [onSelectionChange]);

  const handleExport = () => {
    const json = exportWorkspaceJson();
    // For now, log to console
    // eslint-disable-next-line no-console
    console.log("DHC Modeler workspace export:", json);
    alert("Workspace exported to console (see DevTools).");
  };

  return (
    <div className="dhc-panel">
      <div className="dhc-panel-header">
        <span className="dhc-panel-title">
          {t("workspace.canvas.title")}
        </span>
        <span className="dhc-panel-tag">Blockly</span>
      </div>
      <div className="dhc-panel-body">
        <div className="dhc-canvas-area">
          <span className="dhc-canvas-label">Workspace</span>
          <div
            ref={containerRef}
            style={{ width: "100%", height: "100%" }}
          />
        </div>
        <div style={{ marginTop: "0.6rem", textAlign: "right" }}>
          <button
            type="button"
            onClick={handleExport}
            style={{
              fontSize: "0.75rem",
              padding: "0.25rem 0.6rem",
              borderRadius: "999px",
              border: "1px solid rgba(34,197,94,0.6)",
              background: "rgba(22,163,74,0.12)",
              color: "#bbf7d0",
              cursor: "pointer",
            }}
          >
            Export workspace (console)
          </button>
        </div>
      </div>
    </div>
  );
};

const Inspector = ({ selectedBlock }) => {
  const { t } = useTranslation();

  const label = selectedBlock?.getFieldValue("LABEL") || "";
  const iri =
    selectedBlock?.getFieldValue("IRI") ||
    selectedBlock?.getFieldValue("BASE") ||
    "";
  const comment = selectedBlock?.getFieldValue("COMMENT") || "";

  return (
    <div className="dhc-panel">
      <div className="dhc-panel-header">
        <span className="dhc-panel-title">
          {t("workspace.inspector.title")}
        </span>
        <span className="dhc-panel-tag">Details</span>
      </div>
      <div className="dhc-panel-body">
        <p>{t("workspace.inspector.help")}</p>
        <div className="dhc-inspector-field">
          <div className="dhc-inspector-label">Label</div>
          <input
            className="dhc-inspector-input"
            type="text"
            value={label}
            readOnly
          />
        </div>
        <div className="dhc-inspector-field">
          <div className="dhc-inspector-label">IRI / Base</div>
          <input
            className="dhc-inspector-input"
            type="text"
            value={iri}
            readOnly
          />
        </div>
        <div className="dhc-inspector-field">
          <div className="dhc-inspector-label">Comment</div>
          <input
            className="dhc-inspector-input"
            type="text"
            value={comment}
            readOnly
          />
        </div>
      </div>
    </div>
  );
};

const WorkspaceShell = () => {
  const { t } = useTranslation();
  const [selectedBlock, setSelectedBlock] = React.useState(null);

  return (
    <section>
      <h2 className="dhc-section-title">{t("section.workspace")}</h2>
      <div className="dhc-workspace">
        <Sidebar />
        <Canvas onSelectionChange={setSelectedBlock} />
        <Inspector selectedBlock={selectedBlock} />
      </div>
    </section>
  );
};

export default WorkspaceShell;
