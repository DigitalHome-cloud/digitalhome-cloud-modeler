/**
 * S3 utilities for browsing and publishing ontology artifacts.
 * Uses Amplify Storage v6 (list, downloadData, uploadData).
 */
import { list, downloadData, uploadData } from "aws-amplify/storage";

const S3_PREFIX = "ontology";

/**
 * List all ontology versions on S3, grouped by top-level folder.
 * Returns [{ version, fileCount, lastModified, files: [{key, size, lastModified}] }]
 */
export async function listOntologyVersions() {
  const result = await list({
    path: `public/${S3_PREFIX}/`,
    options: { listAll: true },
  });

  // Group files by version folder (e.g. "v1.1.0", "latest")
  const versionMap = {};

  for (const item of result.items) {
    // item.path = "public/ontology/v1.1.0/ontology-graph.json"
    const relative = item.path.replace(`public/${S3_PREFIX}/`, "");
    const slashIdx = relative.indexOf("/");
    if (slashIdx === -1) continue; // skip files at root level

    const version = relative.substring(0, slashIdx);
    const fileName = relative.substring(slashIdx + 1);
    if (!fileName) continue; // skip folder markers

    if (!versionMap[version]) {
      versionMap[version] = { version, files: [], lastModified: null };
    }

    const entry = {
      key: item.path,
      fileName,
      size: item.size,
      lastModified: item.lastModified,
    };

    versionMap[version].files.push(entry);

    if (
      !versionMap[version].lastModified ||
      item.lastModified > versionMap[version].lastModified
    ) {
      versionMap[version].lastModified = item.lastModified;
    }
  }

  // Convert to array, add fileCount, sort (latest first, then descending version)
  return Object.values(versionMap)
    .map((v) => ({ ...v, fileCount: v.files.length }))
    .sort((a, b) => {
      if (a.version === "latest") return -1;
      if (b.version === "latest") return 1;
      return b.version.localeCompare(a.version);
    });
}

/**
 * Fetch the ontology-graph.json metadata for a specific version.
 */
export async function fetchOntologyMeta(version) {
  try {
    const result = await downloadData({
      path: `public/${S3_PREFIX}/${version}/ontology-graph.json`,
    }).result;
    const json = await result.body.text();
    return JSON.parse(json);
  } catch (err) {
    console.warn("[S3] Failed to fetch ontology meta for", version, err.message);
    return null;
  }
}

/**
 * Publish ontology artifacts to S3 at both v{VERSION}/ and latest/.
 * Only publishes JSON artifacts available as static imports (Option B).
 *
 * @param {object} params
 * @param {string} params.version — e.g. "1.1.0"
 * @param {object} params.graphJson — ontology-graph.json content
 * @param {object} params.blocklyBlocks — blockly-blocks.json content
 * @param {object} params.blocklyToolbox — blockly-toolbox.json content
 * @param {function} params.onProgress — callback(uploaded, total)
 */
export async function publishOntologyArtifacts({
  version,
  graphJson,
  blocklyBlocks,
  blocklyToolbox,
  onProgress,
}) {
  const artifacts = [
    { name: "ontology-graph.json", data: graphJson, contentType: "application/json" },
    { name: "blockly-blocks.json", data: blocklyBlocks, contentType: "application/json" },
    { name: "blockly-toolbox.json", data: blocklyToolbox, contentType: "application/json" },
  ];

  const prefixes = [`${S3_PREFIX}/v${version}`, `${S3_PREFIX}/latest`];
  const total = artifacts.length * prefixes.length;
  let uploaded = 0;
  const errors = [];

  for (const artifact of artifacts) {
    for (const prefix of prefixes) {
      try {
        await uploadData({
          path: `public/${prefix}/${artifact.name}`,
          data: JSON.stringify(artifact.data, null, 2),
          options: { contentType: artifact.contentType },
        }).result;
        uploaded++;
        if (onProgress) onProgress(uploaded, total);
      } catch (err) {
        errors.push({ file: `${prefix}/${artifact.name}`, error: err.message });
      }
    }
  }

  return { uploaded, total, errors };
}
