import React, { useEffect, useRef, useState, useCallback } from "react";

const BlocklyTestWorkspace = ({ blocks, toolbox }) => {
  const containerRef = useRef(null);
  const workspaceRef = useRef(null);
  const [fullscreen, setFullscreen] = useState(false);

  const initWorkspace = useCallback(() => {
    if (typeof window === "undefined") return;

    let Blockly;
    try {
      Blockly = require("blockly");
    } catch {
      return;
    }

    if (!blocks || !toolbox || !containerRef.current) return;

    if (workspaceRef.current) {
      workspaceRef.current.dispose();
      workspaceRef.current = null;
    }

    for (const blockDef of blocks) {
      Blockly.Blocks[blockDef.type] = {
        init: function () {
          this.jsonInit(blockDef);
        },
      };
    }

    const workspace = Blockly.inject(containerRef.current, {
      toolbox,
      grid: { spacing: 20, length: 3, colour: "#334155", snap: true },
      zoom: { controls: true, wheel: true, startScale: 0.9 },
      trashcan: true,
      renderer: "zelos",
    });

    workspaceRef.current = workspace;

    return () => {
      if (workspaceRef.current) {
        workspaceRef.current.dispose();
        workspaceRef.current = null;
      }
    };
  }, [blocks, toolbox]);

  useEffect(() => {
    const cleanup = initWorkspace();
    return cleanup;
  }, [initWorkspace]);

  useEffect(() => {
    if (workspaceRef.current && typeof window !== "undefined") {
      const Blockly = require("blockly");
      Blockly.svgResize(workspaceRef.current);
    }
  }, [fullscreen]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape" && fullscreen) setFullscreen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [fullscreen]);

  const wrapperClass = fullscreen
    ? "dhc-builder-workspace dhc-builder-workspace--fullscreen"
    : "dhc-builder-workspace";

  return (
    <div className={fullscreen ? "dhc-builder-workspace--fullscreen" : ""}>
      {fullscreen && (
        <div className="dhc-builder-workspace-header" style={{ marginBottom: "0.5rem" }}>
          <h2 style={{ margin: 0, fontSize: "0.85rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Test Workspace
          </h2>
          <button
            type="button"
            className="dhc-btn dhc-btn--sm"
            onClick={() => setFullscreen(false)}
            title="Exit fullscreen (Esc)"
          >
            Exit Fullscreen
          </button>
        </div>
      )}
      {!fullscreen && (
        <button
          type="button"
          className="dhc-btn dhc-btn--sm dhc-fullscreen-btn"
          onClick={() => setFullscreen(true)}
          title="Fullscreen"
          aria-label="Toggle fullscreen"
        >
          &#x26F6;
        </button>
      )}
      <div
        ref={containerRef}
        className="dhc-blockly-workspace"
        style={{
          width: "100%",
          height: fullscreen ? "calc(100vh - 60px)" : "100%",
          flex: fullscreen ? undefined : 1,
          minHeight: fullscreen ? undefined : "400px",
        }}
      />
    </div>
  );
};

export default BlocklyTestWorkspace;
