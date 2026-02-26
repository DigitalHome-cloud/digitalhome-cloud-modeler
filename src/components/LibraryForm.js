import * as React from "react";
import { useTranslation } from "react-i18next";
import { generateClient } from "aws-amplify/api";
import { createLibraryItem, updateLibraryItem } from "../graphql/mutations";
import graphData from "../data/ontology-graph.json";

const client = typeof window !== "undefined" ? generateClient() : null;

// Group ontology classes by design view for the multi-select
const VIEW_ORDER = [
  "spatial", "building", "electrical", "plumbing",
  "heating", "network", "governance", "automation",
];

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

function getClassesByView() {
  const groups = {};
  for (const node of graphData.nodes) {
    if (node.type !== "class") continue;
    const view = node.view || "shared";
    if (!groups[view]) groups[view] = [];
    groups[view].push(node);
  }
  return groups;
}

const classesByView = getClassesByView();

const LibraryForm = ({ item, onClose, onSaved }) => {
  const { t } = useTranslation();
  const isEdit = item && item.id;

  const [title, setTitle] = React.useState(item?.title || "");
  const [version, setVersion] = React.useState(item?.version || "1.0.0");
  const [region, setRegion] = React.useState(item?.region || "");
  const [standards, setStandards] = React.useState(
    (item?.standards || []).join(", ")
  );
  const [description, setDescription] = React.useState(item?.description || "");
  const [selectedClasses, setSelectedClasses] = React.useState(
    new Set(item?.compatibleClasses || [])
  );
  const [hasActorCapability, setHasActorCapability] = React.useState(
    item?.hasActorCapability || false
  );
  const [hasSensorCapability, setHasSensorCapability] = React.useState(
    item?.hasSensorCapability || false
  );
  const [hasControllerCapability, setHasControllerCapability] = React.useState(
    item?.hasControllerCapability || false
  );
  const [saving, setSaving] = React.useState(false);

  const toggleClass = (cls) => {
    setSelectedClasses((prev) => {
      const next = new Set(prev);
      if (next.has(cls)) {
        next.delete(cls);
      } else {
        next.add(cls);
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !version.trim()) return;

    const input = {
      title: title.trim(),
      version: version.trim(),
      region: region.trim() || null,
      standards: standards
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      description: description.trim() || null,
      compatibleClasses: [...selectedClasses],
      hasActorCapability,
      hasSensorCapability,
      hasControllerCapability,
    };

    try {
      setSaving(true);
      if (isEdit) {
        await client.graphql({
          query: updateLibraryItem,
          variables: { input: { id: item.id, ...input } },
        });
      } else {
        await client.graphql({
          query: createLibraryItem,
          variables: { input },
        });
      }
      onSaved();
    } catch (err) {
      console.error("[LibraryForm] Save error:", err);
      alert("Failed to save item.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dhc-library-form-overlay">
      <form className="dhc-library-form" onSubmit={handleSubmit}>
        <h2>{isEdit ? "Edit Library Item" : "Create Library Item"}</h2>

        <label className="dhc-library-form-label">
          {t("library.field.title")} *
          <input
            className="dhc-inspector-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </label>

        <label className="dhc-library-form-label">
          {t("library.field.version")} *
          <input
            className="dhc-inspector-input"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            required
          />
        </label>

        <label className="dhc-library-form-label">
          {t("library.field.region")}
          <input
            className="dhc-inspector-input"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="e.g. EU, DE, US"
          />
        </label>

        <label className="dhc-library-form-label">
          {t("library.field.standards")}
          <input
            className="dhc-inspector-input"
            value={standards}
            onChange={(e) => setStandards(e.target.value)}
            placeholder="Comma-separated, e.g. KNX, Zigbee, Matter"
          />
        </label>

        <label className="dhc-library-form-label">
          {t("library.field.description")}
          <textarea
            className="dhc-inspector-input dhc-library-form-textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </label>

        <div className="dhc-library-form-capabilities">
          <div className="dhc-library-form-label">Device Capabilities</div>
          <div style={{ display: "flex", gap: "1rem", marginTop: "0.25rem" }}>
            <label className="dhc-library-form-class-item">
              <input
                type="checkbox"
                checked={hasActorCapability}
                onChange={(e) => setHasActorCapability(e.target.checked)}
              />
              <span>Actor</span>
            </label>
            <label className="dhc-library-form-class-item">
              <input
                type="checkbox"
                checked={hasSensorCapability}
                onChange={(e) => setHasSensorCapability(e.target.checked)}
              />
              <span>Sensor</span>
            </label>
            <label className="dhc-library-form-class-item">
              <input
                type="checkbox"
                checked={hasControllerCapability}
                onChange={(e) => setHasControllerCapability(e.target.checked)}
              />
              <span>Controller</span>
            </label>
          </div>
        </div>

        <div className="dhc-library-form-classes">
          <div className="dhc-library-form-label">
            {t("library.field.compatibleClasses")}
          </div>
          <div className="dhc-library-form-class-groups">
            {VIEW_ORDER.map((view) => {
              const classes = classesByView[view];
              if (!classes || classes.length === 0) return null;
              return (
                <div key={view} className="dhc-library-form-class-group">
                  <div className="dhc-library-form-class-group-label">
                    {VIEW_LABELS[view]}
                  </div>
                  {classes.map((node) => (
                    <label key={node.id} className="dhc-library-form-class-item">
                      <input
                        type="checkbox"
                        checked={selectedClasses.has(node.id)}
                        onChange={() => toggleClass(node.id)}
                      />
                      <span>{node.label}</span>
                    </label>
                  ))}
                </div>
              );
            })}
            {classesByView["shared"] && (
              <div className="dhc-library-form-class-group">
                <div className="dhc-library-form-class-group-label">Shared</div>
                {classesByView["shared"].map((node) => (
                  <label key={node.id} className="dhc-library-form-class-item">
                    <input
                      type="checkbox"
                      checked={selectedClasses.has(node.id)}
                      onChange={() => toggleClass(node.id)}
                    />
                    <span>{node.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="dhc-library-form-actions">
          <button
            type="submit"
            className="dhc-button-primary"
            disabled={saving}
          >
            {saving ? "Saving..." : t("library.save")}
          </button>
          <button
            type="button"
            className="dhc-button-secondary"
            onClick={onClose}
          >
            {t("library.cancel")}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LibraryForm;
