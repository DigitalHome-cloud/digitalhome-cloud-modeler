import React, { createContext, useContext, useState, useCallback } from "react";
import { fetchBranchCommitSha, fetchOntologyChain } from "../utils/github";
import { parseGraphs } from "../utils/ttlParser";
import { generateBlocklyArtifacts } from "../utils/blocklyGenerator";
import { buildOntologyGraph } from "../utils/graphGenerator";
import { buildCboxRegistry } from "../utils/cboxRegistryGenerator";
import {
  fetchWorkdirMeta,
  fetchWorkdirArtifact,
} from "../utils/s3";
import { PIPELINE_VERSION, isCacheHit } from "../utils/buildPipeline";

const OntologyContext = createContext(null);

export const OntologyProvider = ({ children }) => {
  const [branch, setBranch] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("dhc-modeler-branch") || "main";
    }
    return "main";
  });

  const [fetchState, setFetchState] = useState("idle");
  const [error, setError] = useState(null);

  // v2 ingestion state
  const [commitSha, setCommitSha] = useState(null);
  const [store, setStore] = useState(null);
  const [tbox, setTbox] = useState(null);
  const [cbox, setCbox] = useState(null);
  const [contextJsonld, setContextJsonld] = useState(null);

  const [ontologyGraph, setOntologyGraph] = useState(null);
  const [blocklyArtifacts, setBlocklyArtifacts] = useState(null);
  const [cboxRegistry, setCboxRegistry] = useState(null);

  // Cache telemetry — exposed for the Config page's hit/miss indicator.
  const [cacheStatus, setCacheStatus] = useState("idle");

  const selectBranch = useCallback((newBranch) => {
    setBranch(newBranch);
    if (typeof window !== "undefined") {
      localStorage.setItem("dhc-modeler-branch", newBranch);
    }
  }, []);

  const fetchOntology = useCallback(
    async (targetBranch, opts = {}) => {
      const br = targetBranch || branch;
      const force = opts.force === true;
      setFetchState("loading");
      setError(null);
      setCacheStatus("checking");

      try {
        // Step 1 — resolve the upstream commit SHA (single API call).
        const upstreamSha = await fetchBranchCommitSha(br);

        // Step 2 — see whether a matching workdir already exists on S3.
        if (!force) {
          const meta = await fetchWorkdirMeta(br).catch(() => null);
          if (
            isCacheHit({
              meta,
              upstreamSha,
              pipelineVersion: PIPELINE_VERSION,
            })
          ) {
            try {
              const [graph, blocks, toolbox, registry] = await Promise.all([
                fetchWorkdirArtifact(br, "ontology-graph.json"),
                fetchWorkdirArtifact(br, "blockly-blocks.json"),
                fetchWorkdirArtifact(br, "blockly-toolbox.json"),
                fetchWorkdirArtifact(br, "cbox-registry.json").catch(
                  () => null
                ),
              ]);
              setCommitSha(upstreamSha);
              setOntologyGraph(graph);
              setBlocklyArtifacts({ blocks, toolbox });
              setCboxRegistry(registry);
              // T-Box / C-Box views are absent on a cache hit — consumers
              // that need the raw RDF must force a rebuild.
              setTbox({ version: meta.version, classes: [], objectProperties: [], dataProperties: [], enumInstancesByClass: {} });
              setCbox([]);
              setStore(null);
              setContextJsonld(null);

              selectBranch(br);
              setCacheStatus("hit");
              setFetchState("ready");
              return;
            } catch (cacheErr) {
              console.warn(
                "[OntologyContext] Cache hit but artifact fetch failed — rebuilding.",
                cacheErr
              );
            }
          }
        }

        // Step 3 — cache miss (or forced): fetch + parse + generate.
        const chain = await fetchOntologyChain(br);

        const tboxTtls = [
          { name: "core", ttl: chain.tbox.coreTtl },
          { name: "roles", ttl: chain.tbox.rolesTtl },
        ];
        const cboxTtls = chain.cbox.shapes.map((s) => ({
          profile: s,
          ttl: s.ttl,
        }));

        const {
          store: parsedStore,
          tbox: parsedTbox,
          cbox: parsedCbox,
        } = parseGraphs({ tboxTtls, cboxTtls });

        setStore(parsedStore);
        setTbox(parsedTbox);
        setCbox(parsedCbox);
        setCommitSha(chain.commitSha);
        setContextJsonld(chain.tbox.contextJsonld);

        setOntologyGraph(
          buildOntologyGraph({ tbox: parsedTbox, cbox: parsedCbox })
        );
        setBlocklyArtifacts(
          generateBlocklyArtifacts({ tbox: parsedTbox, cbox: parsedCbox })
        );
        setCboxRegistry(
          buildCboxRegistry({
            cbox: parsedCbox,
            registryVersion: parsedTbox.version,
          })
        );

        selectBranch(br);
        setCacheStatus(force ? "forced-rebuild" : "miss");
        setFetchState("ready");
      } catch (err) {
        console.error("[OntologyContext] Fetch failed:", err);
        setError(err.message);
        setCacheStatus("error");
        setFetchState("error");
      }
    },
    [branch, selectBranch]
  );

  // Legacy surface kept as no-op until Phase C rewires the builder.
  const rebuildBlockly = useCallback(() => {}, []);

  // Derived meta shim for legacy consumers (Config page displays version/label).
  const meta = tbox
    ? { version: tbox.version, label: "DigitalHome.Cloud Core" }
    : null;

  const value = {
    branch,
    selectBranch,
    fetchState,
    error,
    fetchOntology,

    // v2 bundle
    commitSha,
    store,
    tbox,
    cbox,
    contextJsonld,

    // v2 artifacts
    ontologyGraph,
    blocklyArtifacts,
    cboxRegistry,

    // cache telemetry
    cacheStatus,

    // legacy compat shims
    meta,
    rebuildBlockly,
  };

  return (
    <OntologyContext.Provider value={value}>
      {children}
    </OntologyContext.Provider>
  );
};

export const useOntology = () => {
  const ctx = useContext(OntologyContext);
  if (!ctx) {
    throw new Error("useOntology must be used within an OntologyProvider");
  }
  return ctx;
};
