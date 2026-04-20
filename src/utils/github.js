/**
 * GitHub Raw Content API utilities.
 * Fetches the v2 Multi-Box ontology layout from digitalhome-cloud-core.
 */

const GITHUB_RAW_BASE =
  "https://raw.githubusercontent.com/DigitalHome-cloud/digitalhome-cloud-core";

const GITHUB_API_BASE =
  "https://api.github.com/repos/DigitalHome-cloud/digitalhome-cloud-core";

const PATHS = {
  coreTbox: "schema/tbox/dhc-core.schema.ttl",
  rolesTbox: "schema/tbox/dhc-roles.ttl",
  context: "schema/tbox/context.jsonld",
  cboxManifest: "schema/cbox/cbox-manifest.json",
};

function buildRawUrl(branch, filePath) {
  return `${GITHUB_RAW_BASE}/${encodeURIComponent(branch)}/${filePath}`;
}

async function fetchText(branch, filePath) {
  const url = buildRawUrl(branch, filePath);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${filePath} from branch "${branch}" (HTTP ${response.status})`
    );
  }
  return response.text();
}

async function fetchJson(branch, filePath) {
  const text = await fetchText(branch, filePath);
  return JSON.parse(text);
}

/**
 * Resolve the commit SHA of a branch tip via the unauthenticated GitHub API.
 * One request per call; 60/hr rate-limit is acceptable for interactive use.
 */
export async function fetchBranchCommitSha(branch) {
  const url = `${GITHUB_API_BASE}/commits/${encodeURIComponent(branch)}`;
  const response = await fetch(url, {
    headers: { Accept: "application/vnd.github.sha" },
  });
  if (!response.ok) {
    throw new Error(
      `Failed to resolve commit SHA for branch "${branch}" (HTTP ${response.status})`
    );
  }
  return (await response.text()).trim();
}

/**
 * Fetch the full v2 ontology bundle from a branch.
 *
 * @param {string} branch
 * @returns {Promise<{
 *   commitSha: string,
 *   tbox: { coreTtl: string, rolesTtl: string, contextJsonld: string },
 *   cbox: {
 *     manifest: Object,
 *     shapes: Array<{ id: string, file: string, label: Object, country: string,
 *                     domain: string, version: string, norm: string,
 *                     requires: string[], ttl: string }>
 *   }
 * }>}
 * @throws {Error} on any fetch failure — no fallback.
 */
export async function fetchOntologyChain(branch) {
  const [commitSha, coreTtl, rolesTtl, contextJsonld, manifest] =
    await Promise.all([
      fetchBranchCommitSha(branch),
      fetchText(branch, PATHS.coreTbox),
      fetchText(branch, PATHS.rolesTbox),
      fetchText(branch, PATHS.context),
      fetchJson(branch, PATHS.cboxManifest),
    ]);

  const shapes = await Promise.all(
    manifest.profiles.map(async (profile) => {
      const ttl = await fetchText(branch, `schema/cbox/${profile.file}`);
      return { ...profile, ttl };
    })
  );

  return {
    commitSha,
    tbox: { coreTtl, rolesTtl, contextJsonld },
    cbox: { manifest, shapes },
  };
}
