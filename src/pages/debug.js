import React, { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { graphql, navigate } from "gatsby";
import { list } from "aws-amplify/storage";

const S3_PREFIX = "ontology";
const S3_BUCKET = "digitalhome-cloudec099-main";
const S3_REGION = "eu-central-1";
const S3_BASE_URL = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com`;
const GITHUB_RAW_BASE = "https://raw.githubusercontent.com/DigitalHome-cloud/digitalhome-cloud-core";
const GITHUB_REPO_URL = "https://github.com/DigitalHome-cloud/digitalhome-cloud-core";

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

const S3Browser = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("");

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await list({
        path: `public/${S3_PREFIX}/`,
        options: { listAll: true },
      });
      const sorted = [...result.items].sort((a, b) =>
        a.path.localeCompare(b.path)
      );
      setItems(sorted);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const filtered = filter
    ? items.filter((i) => i.path.toLowerCase().includes(filter.toLowerCase()))
    : items;

  const grouped = {};
  for (const item of filtered) {
    const relative = item.path.replace(`public/${S3_PREFIX}/`, "");
    const slashIdx = relative.indexOf("/");
    const folder = slashIdx > -1 ? relative.substring(0, slashIdx) : "(root)";
    if (!grouped[folder]) grouped[folder] = [];
    grouped[folder].push({ ...item, relative });
  }

  return (
    <div className="dhc-debug-section">
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
        <h2 style={{ margin: 0 }}>S3 Objects</h2>
        <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
          {items.length} objects
        </span>
        <button
          type="button"
          className="dhc-btn dhc-btn--sm"
          onClick={loadItems}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      <div style={{ marginBottom: "0.75rem" }}>
        <code className="dhc-debug-url">s3://{S3_BUCKET}/public/{S3_PREFIX}/</code>
        <br />
        <code className="dhc-debug-url">{S3_BASE_URL}/public/{S3_PREFIX}/</code>
      </div>

      <input
        type="text"
        className="dhc-debug-filter"
        placeholder="Filter by path..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      {loading && <p style={{ color: "#94a3b8" }}>Loading...</p>}
      {error && <p className="dhc-error-message">{error}</p>}

      {!loading &&
        Object.entries(grouped).map(([folder, folderItems]) => (
          <details key={folder} className="dhc-debug-folder" open={!!filter}>
            <summary className="dhc-debug-folder-header">
              <span className="dhc-debug-folder-name">{folder}/</span>
              <span className="dhc-debug-folder-count">
                {folderItems.length} files
              </span>
            </summary>
            <table className="dhc-table dhc-table--compact">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Full URL</th>
                  <th>Size</th>
                  <th>Last Modified</th>
                </tr>
              </thead>
              <tbody>
                {folderItems.map((item) => {
                  const fullUrl = `${S3_BASE_URL}/${item.path}`;
                  return (
                    <tr key={item.path}>
                      <td>
                        <code style={{ fontSize: "0.75rem" }}>
                          {item.relative}
                        </code>
                      </td>
                      <td>
                        <a
                          href={fullUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: "0.7rem", wordBreak: "break-all" }}
                        >
                          {fullUrl}
                        </a>
                      </td>
                      <td>{formatBytes(item.size)}</td>
                      <td>{formatDate(item.lastModified)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </details>
        ))}
    </div>
  );
};

const DebugPage = () => {
  const { authState, isAuthenticated, user, groups, hasGroup } = useAuth();

  useEffect(() => {
    if (authState === "loading") return;
    if (!isAuthenticated) {
      navigate("/signin/");
    }
  }, [authState, isAuthenticated]);

  if (!isAuthenticated) return null;

  const isModeler = hasGroup("dhc-modelers");
  const isAdmin = hasGroup("dhc-admins");
  const showS3 = isModeler || isAdmin;

  const payload = user?.idTokenPayload || {};

  return (
    <Layout>
      <main className="dhc-main">
        <h1>Debug</h1>

        <div className="dhc-debug-section">
          <h2>Auth State</h2>
          <table className="dhc-table">
            <tbody>
              <tr>
                <td>authState</td>
                <td><code>{authState}</code></td>
              </tr>
              <tr>
                <td>username</td>
                <td><code>{user?.username || "—"}</code></td>
              </tr>
              <tr>
                <td>email</td>
                <td><code>{payload.email || "—"}</code></td>
              </tr>
              <tr>
                <td>name</td>
                <td><code>{payload.name || "—"}</code></td>
              </tr>
              <tr>
                <td>sub</td>
                <td><code style={{ fontSize: "0.75rem" }}>{payload.sub || "—"}</code></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="dhc-debug-section">
          <h2>Cognito Groups</h2>
          {groups.length === 0 ? (
            <p style={{ color: "#94a3b8" }}>No groups assigned.</p>
          ) : (
            <div className="dhc-debug-groups">
              {groups.map((g) => (
                <span key={g} className="dhc-debug-group-badge">
                  {g}
                </span>
              ))}
            </div>
          )}
          <table className="dhc-table dhc-table--compact" style={{ marginTop: "0.75rem" }}>
            <thead>
              <tr>
                <th>Group</th>
                <th>Member</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["dhc-welcome", "Tier: Welcome"],
                ["dhc-standard", "Tier: Standard"],
                ["dhc-professional", "Tier: Professional"],
                ["dhc-modelers", "Functional: Modeler"],
                ["dhc-admins", "Functional: Admin"],
              ].map(([group, role]) => (
                <tr key={group}>
                  <td><code>{group}</code></td>
                  <td>
                    {hasGroup(group) ? (
                      <span style={{ color: "#4ade80" }}>Yes</span>
                    ) : (
                      <span style={{ color: "#64748b" }}>No</span>
                    )}
                  </td>
                  <td style={{ color: "#94a3b8" }}>{role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="dhc-debug-section">
          <h2>Token Payload</h2>
          <pre className="dhc-debug-pre">
            {JSON.stringify(payload, null, 2)}
          </pre>
        </div>

        {showS3 && (
          <>
            <div className="dhc-debug-section">
              <h2>GitHub Source (Core Repo)</h2>
              <table className="dhc-table dhc-table--compact">
                <thead>
                  <tr>
                    <th>File</th>
                    <th>Branch: main</th>
                    <th>Branch: stage</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["dhc-core.schema.ttl", "src/ontology/dhc-core.schema.ttl"],
                    ["context.jsonld", "src/ontology/context.jsonld"],
                    ["dhc-roles.ttl", "src/ontology/dhc-roles.ttl"],
                    ["module-manifest.json", "src/modules/module-manifest.json"],
                    ["blockly-overrides.json", "scripts/blockly-overrides.json"],
                  ].map(([label, path]) => (
                    <tr key={path}>
                      <td><code style={{ fontSize: "0.75rem" }}>{label}</code></td>
                      <td>
                        <a
                          href={`${GITHUB_RAW_BASE}/main/${path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: "0.7rem", wordBreak: "break-all" }}
                        >
                          {`${GITHUB_RAW_BASE}/main/${path}`}
                        </a>
                      </td>
                      <td>
                        <a
                          href={`${GITHUB_RAW_BASE}/stage/${path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: "0.7rem", wordBreak: "break-all" }}
                        >
                          {`${GITHUB_RAW_BASE}/stage/${path}`}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "#64748b" }}>
                Repo: <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer">{GITHUB_REPO_URL}</a>
              </p>
            </div>

            <S3Browser />
          </>
        )}

        {!showS3 && (
          <div className="dhc-debug-section">
            <h2>S3 / GitHub</h2>
            <p className="dhc-info-message">
              S3 and GitHub browser requires dhc-modelers or dhc-admins group.
            </p>
          </div>
        )}
      </main>
    </Layout>
  );
};

export default DebugPage;

export const query = graphql`
  query DebugPageQuery($language: String!) {
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
