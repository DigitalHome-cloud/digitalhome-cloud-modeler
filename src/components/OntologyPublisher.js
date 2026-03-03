import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "gatsby-plugin-react-i18next";
import { useAuth } from "../context/AuthContext";
import {
  listOntologyVersions,
  fetchOntologyMeta,
  publishOntologyArtifacts,
} from "../utils/s3";
import graphData from "../data/ontology-graph.json";
import blocklyBlocks from "../data/blockly-blocks.json";
import blocklyToolbox from "../data/blockly-toolbox.json";

function formatBytes(bytes) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString();
}

const OntologyPublisher = () => {
  const { t } = useTranslation();
  const { hasGroup } = useAuth();
  const isAdmin = hasGroup("dhc-admins");

  // S3 browser state
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedVersion, setExpandedVersion] = useState(null);
  const [latestMeta, setLatestMeta] = useState(null);

  // Publish state
  const [publishing, setPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState({ uploaded: 0, total: 0 });
  const [publishResult, setPublishResult] = useState(null);

  const localVersion = graphData.meta?.version;

  const loadVersions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listOntologyVersions();
      setVersions(data);

      // Fetch latest meta to show which version it mirrors
      const meta = await fetchOntologyMeta("latest");
      setLatestMeta(meta);
    } catch (err) {
      console.warn("[Publisher] Failed to list versions:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  const handlePublish = async () => {
    setPublishing(true);
    setPublishResult(null);
    setPublishProgress({ uploaded: 0, total: 0 });

    try {
      const result = await publishOntologyArtifacts({
        version: localVersion,
        graphJson: graphData,
        blocklyBlocks,
        blocklyToolbox,
        onProgress: (uploaded, total) =>
          setPublishProgress({ uploaded, total }),
      });
      setPublishResult(result);
      // Refresh the browser
      await loadVersions();
    } catch (err) {
      setPublishResult({ uploaded: 0, total: 0, errors: [{ error: err.message }] });
    } finally {
      setPublishing(false);
    }
  };

  const toggleExpand = (version) => {
    setExpandedVersion(expandedVersion === version ? null : version);
  };

  const latestDeployedVersion = latestMeta?.meta?.version;

  const publishArtifacts = [
    { name: "ontology-graph.json", desc: "Ontology graph with classes, properties, and links" },
    { name: "blockly-blocks.json", desc: "Block definitions for Blockly workspace" },
    { name: "blockly-toolbox.json", desc: "Toolbox configuration for Blockly workspace" },
  ];

  return (
    <div className="dhc-publish">
      {/* S3 Browser Section */}
      <div className="dhc-publish-section">
        <div className="dhc-publish-section-header">
          <h2>{t("publish.s3Title")}</h2>
          <button
            type="button"
            className="dhc-button-secondary"
            onClick={loadVersions}
            disabled={loading}
          >
            {t("publish.refresh")}
          </button>
        </div>

        {loading && (
          <p className="dhc-library-notice">{t("publish.loading")}</p>
        )}

        {error && (
          <p className="dhc-library-notice dhc-library-error">{error}</p>
        )}

        {!loading && !error && versions.length === 0 && (
          <p className="dhc-library-notice">{t("publish.noVersions")}</p>
        )}

        {!loading && versions.length > 0 && (
          <div className="dhc-library-table-wrap">
            <table className="dhc-library-table">
              <thead>
                <tr>
                  <th>{t("publish.version")}</th>
                  <th>{t("publish.fileCount")}</th>
                  <th>{t("publish.lastModified")}</th>
                </tr>
              </thead>
              <tbody>
                {versions.map((v) => (
                  <React.Fragment key={v.version}>
                    <tr
                      onClick={() => toggleExpand(v.version)}
                      style={{ cursor: "pointer" }}
                    >
                      <td>
                        <span className="dhc-publish-version-badge">
                          {v.version}
                        </span>
                        {v.version === "latest" && latestDeployedVersion && (
                          <span className="dhc-publish-version-badge dhc-publish-version-badge--alias">
                            = v{latestDeployedVersion}
                          </span>
                        )}
                      </td>
                      <td>{v.fileCount}</td>
                      <td>{formatDate(v.lastModified)}</td>
                    </tr>
                    {expandedVersion === v.version && (
                      <tr>
                        <td colSpan="3" style={{ padding: 0 }}>
                          <div className="dhc-publish-file-list">
                            {v.files.map((f) => (
                              <div
                                key={f.key}
                                className="dhc-publish-file-row"
                              >
                                <span className="dhc-publish-file-name">
                                  {f.fileName}
                                </span>
                                <span className="dhc-publish-file-size">
                                  {formatBytes(f.size)}
                                </span>
                                <span className="dhc-publish-file-date">
                                  {formatDate(f.lastModified)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Publish Controls (admin-only) */}
      {!isAdmin && (
        <p className="dhc-library-notice" style={{ marginTop: "1.5rem" }}>
          {t("publish.adminRequired")}
        </p>
      )}

      {isAdmin && (
        <div className="dhc-publish-section" style={{ marginTop: "1.5rem" }}>
          <h2>{t("publish.publishTitle")}</h2>

          <div className="dhc-publish-version-compare">
            <div>
              <span className="dhc-inspector-label">
                {t("publish.localVersion")}
              </span>
              <span className="dhc-publish-version-badge">
                v{localVersion}
              </span>
            </div>
            <div>
              <span className="dhc-inspector-label">
                {t("publish.deployedVersion")}
              </span>
              <span className="dhc-publish-version-badge">
                {latestDeployedVersion
                  ? `v${latestDeployedVersion}`
                  : "—"}
              </span>
            </div>
          </div>

          <div className="dhc-publish-artifact-list">
            {publishArtifacts.map((a) => (
              <div key={a.name} className="dhc-publish-file-row">
                <span className="dhc-publish-file-check">&#10003;</span>
                <span className="dhc-publish-file-name">{a.name}</span>
                <span className="dhc-publish-file-desc">{a.desc}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "1rem" }}>
            <button
              type="button"
              className="dhc-button-primary"
              onClick={handlePublish}
              disabled={publishing}
            >
              {publishing ? t("publish.uploading") : t("publish.publishButton")}
            </button>
          </div>

          {publishing && publishProgress.total > 0 && (
            <div className="dhc-publish-progress">
              <div
                className="dhc-publish-progress-bar"
                style={{
                  width: `${(publishProgress.uploaded / publishProgress.total) * 100}%`,
                }}
              />
              <span className="dhc-publish-progress-label">
                {publishProgress.uploaded} / {publishProgress.total}
              </span>
            </div>
          )}

          {publishResult && !publishing && (
            <div
              className={
                publishResult.errors.length > 0
                  ? "dhc-publish-status dhc-publish-status--error"
                  : "dhc-publish-status dhc-publish-status--success"
              }
            >
              {publishResult.errors.length > 0 ? (
                <>
                  {t("publish.error")}: {publishResult.errors.map((e) => e.error).join(", ")}
                </>
              ) : (
                <>
                  {t("publish.success")} ({publishResult.uploaded} files)
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OntologyPublisher;
