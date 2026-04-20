import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { useOntology } from "../context/OntologyContext";
import { useTranslation } from "gatsby-plugin-react-i18next";
import { graphql, navigate } from "gatsby";
import { fetchOntologyMeta, fetchWorkdirMeta } from "../utils/s3";

const ConfigPage = () => {
  const { t } = useTranslation();
  const { authState, isAuthenticated, hasGroup } = useAuth();
  const {
    branch,
    selectBranch,
    fetchState,
    error,
    fetchOntology,
    commitSha,
    tbox,
    cbox,
    cacheStatus,
  } = useOntology();

  const [s3Latest, setS3Latest] = useState(null);
  const [s3Workdir, setS3Workdir] = useState(null);
  const [s3Loading, setS3Loading] = useState(false);

  const canAccess = hasGroup("dhc-modelers") || hasGroup("dhc-admins");

  useEffect(() => {
    if (authState === "loading") return;
    if (!isAuthenticated) {
      navigate("/signin/");
    }
  }, [authState, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setS3Loading(true);
    Promise.all([
      fetchOntologyMeta("latest"),
      fetchWorkdirMeta(branch),
    ])
      .then(([latest, workdir]) => {
        setS3Latest(latest);
        setS3Workdir(workdir);
      })
      .finally(() => setS3Loading(false));
  }, [isAuthenticated, branch]);

  if (!isAuthenticated) return null;
  if (!canAccess) {
    return (
      <Layout>
        <main className="dhc-main">
          <h1>{t("config.title")}</h1>
          <p className="dhc-error-message">{t("config.noAccess")}</p>
        </main>
      </Layout>
    );
  }

  const classCount = tbox ? tbox.classes.length : 0;
  const objPropCount = tbox ? tbox.objectProperties.length : 0;
  const dataPropCount = tbox ? tbox.dataProperties.length : 0;
  const normCount = cbox ? cbox.length : 0;

  return (
    <Layout>
      <main className="dhc-main">
        <h1>{t("config.title")}</h1>
        <p style={{ color: "#94a3b8", marginBottom: "1.5rem" }}>
          {t("config.desc")}
        </p>

        <div className="dhc-config-section">
          <h2>{t("config.source")}</h2>
          <div className="dhc-config-row">
            <span className="dhc-config-label">{t("config.branch")}</span>
            <div className="dhc-config-branch-selector">
              <button
                type="button"
                className={`dhc-btn dhc-btn--sm ${branch === "main" ? "dhc-btn--active" : ""}`}
                onClick={() => selectBranch("main")}
              >
                main
              </button>
              <button
                type="button"
                className={`dhc-btn dhc-btn--sm ${branch === "stage" ? "dhc-btn--active" : ""}`}
                onClick={() => selectBranch("stage")}
              >
                stage
              </button>
              <button
                type="button"
                className="dhc-btn dhc-btn--primary dhc-btn--sm"
                onClick={() => fetchOntology(branch)}
                disabled={fetchState === "loading"}
              >
                {fetchState === "loading" ? t("config.fetching") : t("config.fetch")}
              </button>
            </div>
          </div>

          {error && (
            <div className="dhc-error-message">
              {t("config.fetchError")}: {error}
            </div>
          )}

          {fetchState === "ready" && (
            <div
              style={{
                marginTop: "0.75rem",
                color:
                  cacheStatus === "hit"
                    ? "#22c55e"
                    : cacheStatus === "miss" || cacheStatus === "forced-rebuild"
                      ? "#f59e0b"
                      : "#94a3b8",
                fontSize: "0.875rem",
              }}
            >
              {cacheStatus === "hit"
                ? "Cache hit — build skipped."
                : cacheStatus === "miss"
                  ? "Rebuilt from source."
                  : cacheStatus === "forced-rebuild"
                    ? "Forced rebuild."
                    : null}
            </div>
          )}
        </div>

        {fetchState === "ready" && tbox && (
          <div className="dhc-config-section">
            <h2>{t("config.fetched")}</h2>
            <table className="dhc-table">
              <tbody>
                <tr>
                  <td>{t("config.version")}</td>
                  <td>{tbox.version || "—"}</td>
                </tr>
                <tr>
                  <td>Commit SHA</td>
                  <td>
                    <code>{commitSha ? commitSha.slice(0, 10) : "—"}</code>
                  </td>
                </tr>
                <tr>
                  <td>Classes</td>
                  <td>{classCount}</td>
                </tr>
                <tr>
                  <td>Object properties</td>
                  <td>{objPropCount}</td>
                </tr>
                <tr>
                  <td>Datatype properties</td>
                  <td>{dataPropCount}</td>
                </tr>
                <tr>
                  <td>Norm profiles</td>
                  <td>{normCount}</td>
                </tr>
              </tbody>
            </table>

            {cbox && cbox.length > 0 && (
              <>
                <h3>Norm profiles (C-Box)</h3>
                <table className="dhc-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Label</th>
                      <th>Country</th>
                      <th>Domain</th>
                      <th>Version</th>
                      <th>Shapes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cbox.map((profile) => (
                      <tr key={profile.id}>
                        <td>{profile.id}</td>
                        <td>{profile.label?.en || profile.id}</td>
                        <td>{profile.country}</td>
                        <td>{profile.domain}</td>
                        <td>{profile.version}</td>
                        <td>{profile.shapes.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}

        <div className="dhc-config-section">
          <h2>{t("config.s3Status")}</h2>
          {s3Loading ? (
            <p>{t("publish.loading")}</p>
          ) : (
            <table className="dhc-table">
              <tbody>
                <tr>
                  <td>{t("config.s3Latest")}</td>
                  <td>
                    {s3Latest
                      ? `v${s3Latest.meta?.version || "?"}`
                      : t("config.s3None")}
                  </td>
                </tr>
                <tr>
                  <td>{t("config.s3Workdir")} ({branch})</td>
                  <td>
                    {s3Workdir
                      ? `v${s3Workdir.version || "?"} — ${s3Workdir.builtAt || "?"}`
                      : t("config.s3None")}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </main>
    </Layout>
  );
};

export default ConfigPage;

export const query = graphql`
  query ConfigPageQuery($language: String!) {
    locales: allLocale(filter: { language: { eq: $language } }) {
      edges {
        node {
          ns
          data
          language
        }
      }
    }
  }
`;
