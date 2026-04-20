import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "gatsby-plugin-react-i18next";
import { useAuth } from "../context/AuthContext";
import {
  listOntologyVersions,
  fetchOntologyMeta,
  rollbackToVersion,
} from "../utils/s3";

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString();
}

const OntologyPublisher = () => {
  const { t } = useTranslation();
  const { hasGroup } = useAuth();

  const isAdmin = hasGroup("dhc-admins");

  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedVersion, setExpandedVersion] = useState(null);
  const [latestMeta, setLatestMeta] = useState(null);

  const [rollbackState, setRollbackState] = useState("idle");
  const [rollbackMessage, setRollbackMessage] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, meta] = await Promise.all([
        listOntologyVersions(),
        fetchOntologyMeta("latest"),
      ]);
      setVersions(data);
      setLatestMeta(meta);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRollback = async (version) => {
    setRollbackState("rollingBack");
    setRollbackMessage("");

    try {
      const result = await rollbackToVersion({ version });

      if (result.errors.length > 0) {
        setRollbackState("error");
        setRollbackMessage(result.errors.map((e) => e.file).join(", "));
      } else {
        setRollbackState("done");
        setRollbackMessage(t("publish.rollbackDone", { version }));
        await loadData();
      }
    } catch (err) {
      setRollbackState("error");
      setRollbackMessage(err.message);
    }
  };

  const toggleExpand = (version) => {
    setExpandedVersion(expandedVersion === version ? null : version);
  };

  const latestDeployedVersion = latestMeta?.meta?.version;

  const versionedReleases = versions.filter(
    (v) => v.version !== "latest" && !v.version.startsWith("workdir")
  );

  return (
    <div className="dhc-publish">
      <div className="dhc-publish-section">
        <div className="dhc-publish-section-header">
          <h2>{t("publish.published")}</h2>
          <button
            type="button"
            className="dhc-btn dhc-btn--sm"
            onClick={loadData}
            disabled={loading}
          >
            {t("publish.refresh")}
          </button>
        </div>

        {loading && (
          <p className="dhc-library-notice">{t("publish.loading")}</p>
        )}

        {error && <p className="dhc-error-message">{error}</p>}

        {!loading && versionedReleases.length === 0 && (
          <p className="dhc-info-message">{t("publish.noVersions")}</p>
        )}

        {!loading && versionedReleases.length > 0 && (
          <div className="dhc-library-table-wrap">
            <table className="dhc-library-table">
              <thead>
                <tr>
                  <th>{t("publish.version")}</th>
                  <th>{t("publish.fileCount")}</th>
                  <th>{t("publish.lastModified")}</th>
                  <th aria-label="Actions"></th>
                </tr>
              </thead>
              <tbody>
                {versionedReleases.map((v) => (
                  <React.Fragment key={v.version}>
                    <tr
                      onClick={() => toggleExpand(v.version)}
                      style={{ cursor: "pointer" }}
                    >
                      <td>
                        <span className="dhc-publish-version-badge">
                          {v.version}
                        </span>
                        {latestDeployedVersion &&
                          v.version === `v${latestDeployedVersion}` && (
                            <span className="dhc-publish-version-badge dhc-publish-version-badge--alias">
                              = latest
                            </span>
                          )}
                      </td>
                      <td>{v.fileCount}</td>
                      <td>{formatDate(v.lastModified)}</td>
                      <td>
                        {isAdmin &&
                          latestDeployedVersion &&
                          v.version !== `v${latestDeployedVersion}` && (
                            <button
                              type="button"
                              className="dhc-btn dhc-btn--sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRollback(v.version.replace(/^v/, ""));
                              }}
                              disabled={rollbackState === "rollingBack"}
                            >
                              {t("publish.rollback", {
                                version: v.version.replace(/^v/, ""),
                              })}
                            </button>
                          )}
                      </td>
                    </tr>
                    {expandedVersion === v.version && (
                      <tr>
                        <td colSpan="4" style={{ padding: 0 }}>
                          <div className="dhc-publish-file-list">
                            {v.files.map((f) => (
                              <div
                                key={f.key}
                                className="dhc-publish-file-row"
                              >
                                <span className="dhc-publish-file-name">
                                  {f.fileName}
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

      {!isAdmin && (
        <p className="dhc-info-message" style={{ marginTop: "1rem" }}>
          {t("publish.adminOnly")}
        </p>
      )}

      {rollbackMessage && (
        <div
          className={
            rollbackState === "error"
              ? "dhc-publish-status dhc-publish-status--error"
              : "dhc-publish-status dhc-publish-status--success"
          }
          style={{ marginTop: "1rem" }}
        >
          {rollbackMessage}
        </div>
      )}
    </div>
  );
};

export default OntologyPublisher;
