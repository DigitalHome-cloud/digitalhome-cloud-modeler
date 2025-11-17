// src/blockly/workspace.js
import * as Blockly from "blockly";
import { dhcToolbox } from "./toolbox";
import "./blocks/dhc"; // 👈 important: this executes block definitions

let workspaceRef = null;
let selectionCallback = null;


// // 1. Define your custom block
// Blockly.Blocks['my_custom_block'] = {
//   init: function() {
//     this.appendDummyInput()
//         .appendField("Hello, world!");
//     this.setColour(160);
//     this.setTooltip("");
//     this.setHelpUrl("");
//   }
// };

// // 2. Define the toolbox using JSON, referencing the 'my_custom_block' type
// const dhcToolbox2 = {
//   "kind": "flyoutToolbox",
//   "contents": [
//     {
//       "kind": "block",
//       "type": "my_custom_block" // This links to the definition in Blockly.Blocks
//     }
//   ]
// };

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
    toolbox: dhcToolbox,   // JSON toolbox
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
  console.log("Registered DHC blocks:", Object.keys(Blockly.Blocks).filter(k => k.startsWith("dhc_")));

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
