import React, { createContext, useContext, useState, useCallback } from "react";
import { fetchOntologyChain } from "../utils/github";
import { parseGraphs } from "../utils/ttlParser";

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

  // Phase-B stubs for downstream pages — Phase C replaces with real generators.
  const [ontologyGraph, setOntologyGraph] = useState(null);
  const [blocklyArtifacts, setBlocklyArtifacts] = useState(null);

  const selectBranch = useCallback((newBranch) => {
    setBranch(newBranch);
    if (typeof window !== "undefined") {
      localStorage.setItem("dhc-modeler-branch", newBranch);
    }
  }, []);

  const fetchOntology = useCallback(
    async (targetBranch) => {
      const br = targetBranch || branch;
      setFetchState("loading");
      setError(null);

      try {
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

        // Phase B: no generator yet — consumers must handle nulls.
        setOntologyGraph(null);
        setBlocklyArtifacts(null);

        selectBranch(br);
        setFetchState("ready");
      } catch (err) {
        console.error("[OntologyContext] Fetch failed:", err);
        setError(err.message);
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

    // legacy/stubbed
    meta,
    ontologyGraph,
    blocklyArtifacts,
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
