import * as Blockly from "blockly";
import { getToolboxXml } from "./toolbox";
import "./blocks/dhc";

let workspaceRef = null;

/**
 * Initialise the Blockly workspace in the given DOM container.
 * Safe to call from a React useEffect on the client.
 */
export function initModelerWorkspace(container) {
  if (!container) return null;

  if (workspaceRef) {
    workspaceRef.dispose();
    workspaceRef = null;
  }

  const toolboxXml = getToolboxXml();
  const parser = new DOMParser();
  const xml = parser.parseFromString(toolboxXml, "text/xml").documentElement;

  workspaceRef = Blockly.inject(container, {
    toolbox: xml,
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

  return workspaceRef;
}

export function getWorkspace() {
  return workspaceRef;
}
