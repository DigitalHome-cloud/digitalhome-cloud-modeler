import React, { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { useOntology } from "../context/OntologyContext";
import { useTranslation } from "gatsby-plugin-react-i18next";
import { graphql, navigate } from "gatsby";
import {
  saveToWorkdir,
  fetchWorkdirMeta,
  fetchWorkdirArtifact,
  promoteWorkdir,
} from "../utils/s3";
import BlocklyBuilderMapping from "../components/BlocklyBuilderMapping";
import BlocklyTestWorkspace from "../components/BlocklyTestWorkspace";
import BlockConfigurator from "../components/BlockConfigurator";
import { PIPELINE_VERSION } from "../utils/buildPipeline";

const BuilderPage = () => {
  const { t } = useTranslation();
  const { authState, isAuthenticated, hasGroup, user } = useAuth();
  const {
    branch,
    fetchState,
    meta,
    blocklyArtifacts,
    ontologyGraph,
    cboxRegistry,
    contextJsonld,
    commitSha,
    rebuildBlockly,
  } = useOntology();

  const [selectedBlock, setSelectedBlock] = useState(null);
  const [saveState, setSaveState] = useState("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [promoteState, setPromoteState] = useState("idle");
  const [promoteMessage, setPromoteMessage] = useState("");

  // Workdir state
  const [workdirMeta, setWorkdirMeta] = useState(null);
  const [workdirBlocks, setWorkdirBlocks] = useState(null);
  const [workdirToolbox, setWorkdirToolbox] = useState(null);
  const [workdirLoading, setWorkdirLoading] = useState(false);
  const [showWorkdir, setShowWorkdir] = useState(true);

  const isModeler = hasGroup("dhc-modelers");
  const canAccess = isModeler || hasGroup("dhc-admins");

  useEffect(() => {
    if (authState === "loading") return;
    if (!isAuthenticated) {
      navigate("/signin/");
    }
  }, [authState, isAuthenticated]);

  // Load from workdir on mount and when branch changes
  const loadFromWorkdir = useCallback(async () => {
    setWorkdirLoading(true);
    try {
      const wdMeta = await fetchWorkdirMeta(branch);
      setWorkdirMeta(wdMeta);

      if (wdMeta) {
        const [blocks, toolbox] = await Promise.all([
          fetchWorkdirArtifact(branch, "blockly-blocks.json"),
          fetchWorkdirArtifact(branch, "blockly-toolbox.json"),
        ]);
        setWorkdirBlocks(blocks);
        setWorkdirToolbox(toolbox);
        setShowWorkdir(true);
      } else {
        setWorkdirBlocks(null);
        setWorkdirToolbox(null);
        setShowWorkdir(false);
      }
    } catch {
      setWorkdirBlocks(null);
      setWorkdirToolbox(null);
      setShowWorkdir(false);
    } finally {
      setWorkdirLoading(false);
    }
  }, [branch]);

  useEffect(() => {
    if (isAuthenticated && canAccess) {
      loadFromWorkdir();
    }
  }, [isAuthenticated, canAccess, loadFromWorkdir]);

  const handleSaveToWorkdir = useCallback(async () => {
    if (!blocklyArtifacts || !ontologyGraph || !meta) return;
    setSaveState("saving");
    setSaveMessage("");

    try {
      const buildMeta = {
        builtBy: user?.idTokenPayload?.email || user?.username || "unknown",
        builtAt: new Date().toISOString(),
        branch,
        version: meta.version,
        commitSha,
        pipelineVersion: PIPELINE_VERSION,
      };

      const result = await saveToWorkdir({
        branch,
        blocklyBlocks: blocklyArtifacts.blocks,
        blocklyToolbox: blocklyArtifacts.toolbox,
        ontologyGraph,
        cboxRegistry,
        contextJsonld,
        buildMeta,
      });

      if (result.errors.length > 0) {
        setSaveState("error");
        setSaveMessage(result.errors.map((e) => e.file).join(", "));
      } else {
        setSaveState("done");
        setSaveMessage(t("builder.saved"));
        await loadFromWorkdir();
      }
    } catch (err) {
      setSaveState("error");
      setSaveMessage(err.message);
    }
  }, [blocklyArtifacts, ontologyGraph, meta, branch, user, t, loadFromWorkdir]);

  const handlePromote = useCallback(async () => {
    if (!workdirMeta) return;
    setPromoteState("promoting");
    setPromoteMessage("");

    try {
      const result = await promoteWorkdir({
        branch,
        version: workdirMeta.version,
      });

      if (result.errors.length > 0) {
        setPromoteState("error");
        setPromoteMessage(result.errors.map((e) => e.file).join(", "));
      } else {
        setPromoteState("done");
        setPromoteMessage(
          t("builder.promoteDone", { version: workdirMeta.version })
        );
      }
    } catch (err) {
      setPromoteState("error");
      setPromoteMessage(err.message);
    }
  }, [workdirMeta, branch, contextJsonld, t]);

  if (!isAuthenticated) return null;

  if (!canAccess) {
    return (
      <Layout>
        <main className="dhc-main">
          <h1>{t("builder.title")}</h1>
          <p className="dhc-error-message">{t("builder.noAccess")}</p>
        </main>
      </Layout>
    );
  }

  if (fetchState !== "ready" || !blocklyArtifacts) {
    return (
      <Layout>
        <main className="dhc-main">
          <h1>{t("builder.title")}</h1>
          <p className="dhc-info-message">{t("builder.noData")}</p>
        </main>
      </Layout>
    );
  }

  const readOnly = !isModeler;

  const hasWorkdir = workdirBlocks && workdirToolbox;
  const activeBlocks = showWorkdir && hasWorkdir
    ? workdirBlocks
    : blocklyArtifacts.blocks;
  const activeToolbox = showWorkdir && hasWorkdir
    ? workdirToolbox
    : blocklyArtifacts.toolbox;
  const sourceLabel = showWorkdir && hasWorkdir
    ? t("builder.showingWorkdir")
    : t("builder.showingFresh");

  return (
    <Layout>
      <main className="dhc-main dhc-main--full">
        <div className="dhc-builder-header">
          <h1>{t("builder.title")}</h1>
          <div className="dhc-builder-actions">
            <span className="dhc-builder-stats">
              {blocklyArtifacts.blocks.length} {t("builder.blocks")} | v
              {meta.version} | {branch}
            </span>
            {isModeler && (
              <>
                <button
                  type="button"
                  className="dhc-btn dhc-btn--sm"
                  onClick={() => rebuildBlockly()}
                >
                  {t("builder.recompile")}
                </button>
                <button
                  type="button"
                  className="dhc-btn dhc-btn--primary dhc-btn--sm"
                  onClick={handleSaveToWorkdir}
                  disabled={saveState === "saving"}
                >
                  {saveState === "saving"
                    ? t("builder.saving")
                    : t("builder.saveWorkdir")}
                </button>
                {hasWorkdir && workdirMeta && (
                  <button
                    type="button"
                    className="dhc-btn dhc-btn--sm"
                    onClick={handlePromote}
                    disabled={promoteState === "promoting"}
                  >
                    {promoteState === "promoting"
                      ? t("builder.promoting")
                      : t("builder.promote", { version: workdirMeta.version })}
                  </button>
                )}
              </>
            )}
          </div>
          {saveMessage && (
            <span
              className={
                saveState === "error"
                  ? "dhc-error-message"
                  : "dhc-success-message"
              }
            >
              {saveMessage}
            </span>
          )}
          {promoteMessage && (
            <span
              className={
                promoteState === "error"
                  ? "dhc-error-message"
                  : "dhc-success-message"
              }
            >
              {promoteMessage}
            </span>
          )}
        </div>

        <div className="dhc-builder-layout">
          <div className="dhc-builder-left">
            <h2>{t("builder.mapping")}</h2>
            <BlocklyBuilderMapping
              blocks={blocklyArtifacts.blocks}
              selectedBlock={selectedBlock}
              onSelectBlock={setSelectedBlock}
            />
          </div>

          <div className="dhc-builder-right">
            <div className="dhc-builder-workspace">
              <div className="dhc-builder-workspace-header">
                <h2>{t("builder.workspace")}</h2>
                <div className="dhc-builder-source-toggle">
                  <span className="dhc-builder-source-label">{sourceLabel}</span>
                  {hasWorkdir && (
                    <button
                      type="button"
                      className="dhc-btn dhc-btn--sm"
                      onClick={() => setShowWorkdir((v) => !v)}
                    >
                      {showWorkdir
                        ? t("builder.switchToFresh")
                        : t("builder.switchToWorkdir")}
                    </button>
                  )}
                  <button
                    type="button"
                    className="dhc-btn dhc-btn--sm"
                    onClick={loadFromWorkdir}
                    disabled={workdirLoading}
                  >
                    {t("builder.loadWorkdir")}
                  </button>
                </div>
              </div>
              <BlocklyTestWorkspace
                blocks={activeBlocks}
                toolbox={activeToolbox}
              />
            </div>

            <div className="dhc-builder-configurator">
              <h2>{t("builder.configurator")}</h2>
              <BlockConfigurator
                block={selectedBlock}
                readOnly={readOnly}
              />
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
};

export default BuilderPage;

export const query = graphql`
  query BuilderPageQuery($language: String!) {
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
