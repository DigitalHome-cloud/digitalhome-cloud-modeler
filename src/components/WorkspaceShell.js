import * as React from "react";
import { useTranslation } from "gatsby-plugin-react-i18next";
import { initModelerWorkspace } from "../blockly/workspace";

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

const Canvas = () => {
  const { t } = useTranslation();
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    initModelerWorkspace(containerRef.current);
  }, []);

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
      </div>
    </div>
  );
};

const Inspector = () => {
  const { t } = useTranslation();

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
            placeholder="Class / property label"
          />
        </div>
        <div className="dhc-inspector-field">
          <div className="dhc-inspector-label">IRI</div>
          <input
            className="dhc-inspector-input"
            type="text"
            placeholder="https://digitalhome.cloud/schema/core#Class"
          />
        </div>
        <div className="dhc-inspector-field">
          <div className="dhc-inspector-label">Comment</div>
          <input
            className="dhc-inspector-input"
            type="text"
            placeholder="Short description"
          />
        </div>
      </div>
    </div>
  );
};

const WorkspaceShell = () => {
  const { t } = useTranslation();

  return (
    <section>
      <h2 className="dhc-section-title">{t("section.workspace")}</h2>
      <div className="dhc-workspace">
        <Sidebar />
        <Canvas />
        <Inspector />
      </div>
    </section>
  );
};

export default WorkspaceShell;
