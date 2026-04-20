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

/**
 * Save build artifacts to the S3 workdir for a given branch.
 *
 * v2 adds cbox-registry.json and context.jsonld. The build-meta.json
 * must carry commitSha + pipelineVersion — the cache-hit decision in
 * OntologyContext keys off those two fields.
 */
export async function saveToWorkdir({
  branch,
  blocklyBlocks,
  blocklyToolbox,
  ontologyGraph,
  cboxRegistry,
  contextJsonld,
  buildMeta,
  onProgress,
}) {
  const prefix = `${S3_PREFIX}/workdir/${branch}`;
  const artifacts = [
    { name: "blockly-blocks.json", data: blocklyBlocks, contentType: "application/json" },
    { name: "blockly-toolbox.json", data: blocklyToolbox, contentType: "application/json" },
    { name: "ontology-graph.json", data: ontologyGraph, contentType: "application/json" },
    { name: "build-meta.json", data: buildMeta, contentType: "application/json" },
  ];
  if (cboxRegistry) {
    artifacts.push({
      name: "cbox-registry.json",
      data: cboxRegistry,
      contentType: "application/json",
    });
  }
  if (contextJsonld) {
    artifacts.push({
      name: "context.jsonld",
      data: contextJsonld,
      raw: true,
      contentType: "application/ld+json",
    });
  }

  const total = artifacts.length;
  let uploaded = 0;
  const errors = [];

  for (const artifact of artifacts) {
    try {
      await uploadData({
        path: `public/${prefix}/${artifact.name}`,
        data: artifact.raw
          ? artifact.data
          : JSON.stringify(artifact.data, null, 2),
        options: { contentType: artifact.contentType },
      }).result;
      uploaded++;
      if (onProgress) onProgress(uploaded, total);
    } catch (err) {
      errors.push({ file: `${prefix}/${artifact.name}`, error: err.message });
    }
  }

  return { uploaded, total, errors };
}

/**
 * Fetch workdir build-meta.json for a branch (null if workdir doesn't exist).
 */
export async function fetchWorkdirMeta(branch) {
  try {
    const result = await downloadData({
      path: `public/${S3_PREFIX}/workdir/${branch}/build-meta.json`,
    }).result;
    const json = await result.body.text();
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Fetch a specific artifact from the workdir.
 */
export async function fetchWorkdirArtifact(branch, fileName) {
  const result = await downloadData({
    path: `public/${S3_PREFIX}/workdir/${branch}/${fileName}`,
  }).result;
  const json = await result.body.text();
  return JSON.parse(json);
}

/**
 * Promote workdir artifacts to a versioned release + latest.
 * Reads from workdir/{branch}/ → copies to v{version}/ and latest/.
 */
export async function promoteWorkdir({
  branch,
  version,
  contextJsonld,
  manifest,
  moduleTtls,
  onProgress,
}) {
  const workdirPrefix = `${S3_PREFIX}/workdir/${branch}`;
  const versionedPrefix = `${S3_PREFIX}/v${version}`;
  const latestPrefix = `${S3_PREFIX}/latest`;

  const jsonFiles = [
    "blockly-blocks.json",
    "blockly-toolbox.json",
    "ontology-graph.json",
  ];

  const totalSteps =
    jsonFiles.length * 2 +
    (contextJsonld ? 2 : 0) +
    (manifest ? 2 : 0) +
    (moduleTtls ? moduleTtls.length * 2 : 0);
  let done = 0;

  const errors = [];

  for (const fileName of jsonFiles) {
    try {
      const result = await downloadData({
        path: `public/${workdirPrefix}/${fileName}`,
      }).result;
      const body = await result.body.text();

      await uploadData({
        path: `public/${versionedPrefix}/${fileName}`,
        data: body,
        options: { contentType: "application/json" },
      }).result;
      done++;

      await uploadData({
        path: `public/${latestPrefix}/${fileName}`,
        data: body,
        options: { contentType: "application/json" },
      }).result;
      done++;
    } catch (err) {
      errors.push({ file: fileName, error: err.message });
    }
    if (onProgress) onProgress(done, totalSteps);
  }

  if (contextJsonld) {
    try {
      for (const prefix of [versionedPrefix, latestPrefix]) {
        await uploadData({
          path: `public/${prefix}/context.jsonld`,
          data: contextJsonld,
          options: { contentType: "application/ld+json" },
        }).result;
        done++;
      }
    } catch (err) {
      errors.push({ file: "context.jsonld", error: err.message });
    }
    if (onProgress) onProgress(done, totalSteps);
  }

  if (manifest) {
    try {
      const manifestStr = JSON.stringify(manifest, null, 2);
      for (const prefix of [versionedPrefix, latestPrefix]) {
        await uploadData({
          path: `public/${prefix}/modules/module-manifest.json`,
          data: manifestStr,
          options: { contentType: "application/json" },
        }).result;
        done++;
      }
    } catch (err) {
      errors.push({ file: "module-manifest.json", error: err.message });
    }
    if (onProgress) onProgress(done, totalSteps);
  }

  if (moduleTtls) {
    for (const mod of moduleTtls) {
      try {
        for (const prefix of [versionedPrefix, latestPrefix]) {
          await uploadData({
            path: `public/${prefix}/modules/${mod.file}`,
            data: mod.ttl,
            options: { contentType: "text/turtle" },
          }).result;
          done++;
        }
      } catch (err) {
        errors.push({ file: mod.file, error: err.message });
      }
      if (onProgress) onProgress(done, totalSteps);
    }
  }

  return { uploaded: done, total: totalSteps, errors };
}

/**
 * Rollback: copy a prior version's files to latest/.
 */
export async function rollbackToVersion({ version, onProgress }) {
  const sourcePrefix = `${S3_PREFIX}/v${version}`;
  const latestPrefix = `${S3_PREFIX}/latest`;

  const sourceFiles = await list({
    path: `public/${sourcePrefix}/`,
    options: { listAll: true },
  });

  const total = sourceFiles.items.length;
  let done = 0;
  const errors = [];

  for (const item of sourceFiles.items) {
    const relativePath = item.path.replace(`public/${sourcePrefix}/`, "");
    if (!relativePath) continue;

    try {
      const result = await downloadData({ path: item.path }).result;
      const body = await result.body.text();

      const contentType = relativePath.endsWith(".json")
        ? "application/json"
        : relativePath.endsWith(".jsonld")
          ? "application/ld+json"
          : relativePath.endsWith(".ttl")
            ? "text/turtle"
            : "application/octet-stream";

      await uploadData({
        path: `public/${latestPrefix}/${relativePath}`,
        data: body,
        options: { contentType },
      }).result;
      done++;
    } catch (err) {
      errors.push({ file: relativePath, error: err.message });
    }
    if (onProgress) onProgress(done, total);
  }

  return { uploaded: done, total, errors };
}
