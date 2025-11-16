// src/blockly/workspace.js
import * as Blockly from "blockly";          // or "blockly/core", but same as in dhc.js
import "blockly/blocks";                     // optional, for built-in blocks
import { dhcToolbox } from "./toolbox";
import "./blocks/dhc";

let workspaceRef = null;
let selectionCallback = null;

export function initModelerWorkspace(container, options = {}) {
  if (!container) return null;

  const { onSelectionChange } = options;
  selectionCallback =
    typeof onSelectionChange === "function" ? onSelectionChange : null;

  if (workspaceRef) {
    workspaceRef.dispose();
    workspaceRef = null;
  }

  console.log("Injecting Blockly into:", container);
  console.log("DHC toolbox JSON:", dhcToolbox);

  workspaceRef = Blockly.inject(container, {
    toolbox: dhcToolbox, // 👈 JSON toolbox here
    trashcan: true,
    grid: {
      spacing: 20,
      length: 2,
      colour: "#334155",
      snap: true,
    },
    zoom: {
      controls: true,
      wheel: true,
      startScale: 1.0,
      maxScale: 2,
      minScale: 0.5,
    },
  });

  console.log("Workspace after inject:", workspaceRef);

  workspaceRef.addChangeListener((event) => {
    if (!selectionCallback) return;
    if (event.type !== Blockly.Events.SELECTED) return;
    const id = event.newElementId;
    const block = id ? workspaceRef.getBlockById(id) : null;
    selectionCallback(block || null);
  });

  return workspaceRef;
}

export function getWorkspace() {
  return workspaceRef;
}

export function exportWorkspaceJson() {
  if (!workspaceRef) return null;
  if (!Blockly.serialization || !Blockly.serialization.workspaces) {
    const xmlDom = Blockly.Xml.workspaceToDom(workspaceRef);
    const xmlText = Blockly.Xml.domToText(xmlDom);
    return { xml: xmlText };
  }
  return Blockly.serialization.workspaces.save(workspaceRef);
}
