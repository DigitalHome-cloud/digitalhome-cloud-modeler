#!/usr/bin/env node
/**
 * generate-blockly-toolbox.js
 *
 * Parses dhc-core.schema.ttl and generates Blockly block definitions
 * and a toolbox configuration for the SmartHome Designer.
 *
 * Reuses the TTL parsing approach from parse-ontology.js.
 *
 * Output:
 *   src/data/blockly-blocks.json   — array of Blockly block definitions
 *   src/data/blockly-toolbox.json  — categoryToolbox config grouped by designView
 */

const fs = require("fs");
const path = require("path");

const TTL_PATH = path.resolve(
  __dirname,
  "../semantic-core/ontology/dhc-core.schema.ttl"
);
const OVERRIDES_PATH = path.resolve(__dirname, "blockly-overrides.json");
const BLOCKS_OUT = path.resolve(__dirname, "../src/data/blockly-blocks.json");
const TOOLBOX_OUT = path.resolve(__dirname, "../src/data/blockly-toolbox.json");

// Scope filter: only these designViews produce blocks
// Heater (designView "heating") is cross-listed in electrical via overrides
const DEFAULT_SCOPE = ["spatial", "electrical", "shared"];

// XSD type → Blockly field type mapping
const XSD_TO_BLOCKLY = {
  "xsd:string": "field_input",
  "xsd:integer": "field_number",
  "xsd:decimal": "field_number",
  "xsd:boolean": "field_checkbox",
  "xsd:dateTime": "field_input",
};

// Containment object properties → statement_input
const CONTAINMENT_PROPERTIES = [
  "dhc:hasSpace",
  "dhc:hasFloor",
  "dhc:hasArea",
  "dhc:hasCircuit",
  "dhc:feedsEquipment",
  "dhc:hasEquipment",
  "dhc:hasBuildingElement",
  "dhc:hasWiring",
];

// Reference object properties → value_input
const REFERENCE_PROPERTIES = [
  "dhc:belongsToZone",
  "dhc:hasEquipmentType",
  "dhc:hasProtection",
  "dhc:hasCircuitType",
  "dhc:connectedToNetwork",
  "dhc:hasPart",
];

// View colours matching OntologyGraph.js VIEW_COLOURS
const VIEW_COLOURS = {
  spatial: 142,     // green hue
  building: 36,     // amber hue
  electrical: 220,  // blue hue
  plumbing: 186,    // cyan hue
  heating: 0,       // red hue
  network: 270,     // purple hue
  governance: 25,   // orange hue
  automation: 330,  // pink hue
  shared: 230,      // gray-blue hue
};

// View labels for toolbox categories
const VIEW_LABELS = {
  spatial: "Spatial",
  electrical: "Electrical",
  shared: "Shared",
  building: "Building",
  plumbing: "Plumbing",
  heating: "Heating / HVAC",
  network: "Network",
  governance: "Governance",
  automation: "Automation",
};

// ── TTL Parsing (reused from parse-ontology.js) ──

function extractField(block, predicate) {
  const re = new RegExp(predicate + '\\s+"([^"]*)"(?:@en)?', "m");
  const m = block.match(re);
  return m ? m[1] : null;
}

function extractObject(block, predicate) {
  const re = new RegExp(predicate + "\\s+(\\S+?)\\s*[;.]", "m");
  const m = block.match(re);
  return m ? m[1] : null;
}

function extractDesignView(block) {
  const m = block.match(/dhc:designView\s+"([^"]+)"/);
  return m ? m[1] : null;
}

function getSubjectAndType(block) {
  const m = block.match(/^(dhc:\w+)\s*\n?\s+a\s+(owl:\w+)/m);
  if (!m) return null;
  return { id: m[1], owlType: m[2] };
}

function getSubjectAndTypeCompact(block) {
  const m = block.match(/^(dhc:\w+)\s+a\s+(owl:\w+)\s*;/m);
  if (!m) return null;
  return { id: m[1], owlType: m[2] };
}

// ── Main ──

const ttl = fs.readFileSync(TTL_PATH, "utf-8");
const rawBlocks = ttl.split(/\n\s*\n/);

// Some blocks contain multiple compact definitions on separate lines
// (e.g. "dhc:Socket a owl:Class ; ... .\ndhc:Switch a owl:Class ; ... .")
// Split those into individual definitions
const blocks = [];
for (const raw of rawBlocks) {
  // Check if block contains multiple "dhc:XXX a owl:" patterns on separate lines
  const lines = raw.split("\n");
  let current = [];
  for (const line of lines) {
    if (/^dhc:\w+\s+a\s+owl:/.test(line.trim()) && current.length > 0) {
      // Previous lines form a block, start a new one
      blocks.push(current.join("\n"));
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) {
    blocks.push(current.join("\n"));
  }
}

// Load overrides
let overrides = {};
if (fs.existsSync(OVERRIDES_PATH)) {
  overrides = JSON.parse(fs.readFileSync(OVERRIDES_PATH, "utf-8"));
}

// Parse all TTL entities
const entities = [];
for (const block of blocks) {
  const trimmed = block.trim();
  if (
    !trimmed ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("@prefix") ||
    trimmed.startsWith("<")
  ) {
    continue;
  }

  const parsed =
    getSubjectAndType(trimmed) || getSubjectAndTypeCompact(trimmed);
  if (!parsed) continue;

  const { id, owlType } = parsed;
  if (id === "dhc:designView") continue;

  const label = extractField(trimmed, "rdfs:label") || id.replace("dhc:", "");
  const comment = extractField(trimmed, "rdfs:comment");
  const view = extractDesignView(trimmed);
  const superClass = extractObject(trimmed, "rdfs:subClassOf");
  const domain = extractObject(trimmed, "rdfs:domain");
  const range = extractObject(trimmed, "rdfs:range");

  let type;
  switch (owlType) {
    case "owl:Class":
      type = "class";
      break;
    case "owl:ObjectProperty":
      type = "objectProperty";
      break;
    case "owl:DatatypeProperty":
      type = "datatypeProperty";
      break;
    default:
      type = owlType;
  }

  entities.push({ id, type, label, comment, view, superClass, domain, range });
}

// Index entities
const classMap = new Map();
const datatypeProps = [];
const objectProps = [];

for (const e of entities) {
  if (e.type === "class") {
    classMap.set(e.id, e);
  } else if (e.type === "datatypeProperty") {
    datatypeProps.push(e);
  } else if (e.type === "objectProperty") {
    objectProps.push(e);
  }
}

// Determine scope
const scope = overrides.scope || DEFAULT_SCOPE;

// Determine which classes get blocks
function getEffectiveView(cls) {
  // Check overrides for view assignment
  const localName = cls.id.replace("dhc:", "");
  if (overrides.viewOverrides && overrides.viewOverrides[localName]) {
    return overrides.viewOverrides[localName];
  }
  return cls.view || null;
}

function isInScope(cls) {
  const view = getEffectiveView(cls);
  if (!view) {
    // Classes without designView (Equipment, EquipmentType, Guideline, etc.)
    // Check if they're in the "shared" scope
    if (scope.includes("shared")) {
      const localName = cls.id.replace("dhc:", "");
      const sharedClasses = overrides.sharedClasses || [
        "Equipment",
        "EquipmentType",
      ];
      return sharedClasses.includes(localName);
    }
    return false;
  }
  return scope.includes(view);
}

// Build Blockly block definitions
const blocklyBlocks = [];
const toolboxCategories = {};

for (const [classId, cls] of classMap) {
  if (!isInScope(cls)) continue;

  const localName = cls.id.replace("dhc:", "");
  const blockType = `dhc_${localName.replace(/([A-Z])/g, (m, c, i) => (i > 0 ? "_" : "") + c.toLowerCase())}`;
  const effectiveView = getEffectiveView(cls) || "shared";
  const colour = VIEW_COLOURS[effectiveView] || VIEW_COLOURS.shared;

  // Collect datatype properties for this class
  const classDataProps = datatypeProps.filter((p) => p.domain === classId);

  // Collect object properties where this class is the domain
  const classObjectProps = objectProps.filter((p) => p.domain === classId);

  // Build block definition
  const blockDef = {
    type: blockType,
    ontologyClass: classId,
    designView: effectiveView,
    colour: colour,
    message0: "",
    args0: [],
    inputsInline: false,
    tooltip: cls.comment || cls.label,
  };

  const messageParts = [];
  const args = [];
  let argIndex = 0;

  // LABEL field (always first)
  messageParts.push(`${cls.label} %${argIndex + 1}`);
  args.push({
    type: "field_input",
    name: "LABEL",
    text: cls.label,
  });
  argIndex++;

  // Datatype property fields
  for (const dp of classDataProps) {
    const dpLocalName = dp.id
      .replace("dhc:", "")
      .replace(/([A-Z])/g, (m) => "_" + m)
      .toUpperCase();
    const fieldName = dpLocalName;
    const fieldType = XSD_TO_BLOCKLY[dp.range] || "field_input";

    // Check for dropdown overrides
    const overrideKey = dp.id.replace("dhc:", "");
    if (overrides.dropdowns && overrides.dropdowns[overrideKey]) {
      messageParts.push(`${dp.label} %${argIndex + 1}`);
      args.push({
        type: "field_dropdown",
        name: fieldName,
        options: overrides.dropdowns[overrideKey],
      });
    } else if (fieldType === "field_number") {
      const isInteger = dp.range === "xsd:integer";
      const fieldDef = {
        type: "field_number",
        name: fieldName,
        value: 0,
      };
      if (isInteger) {
        fieldDef.precision = 1;
      }
      // Check for default value overrides
      if (overrides.defaults && overrides.defaults[overrideKey] !== undefined) {
        fieldDef.value = overrides.defaults[overrideKey];
      }
      messageParts.push(`${dp.label} %${argIndex + 1}`);
      args.push(fieldDef);
    } else if (fieldType === "field_checkbox") {
      messageParts.push(`${dp.label} %${argIndex + 1}`);
      args.push({
        type: "field_checkbox",
        name: fieldName,
        checked: false,
      });
    } else {
      messageParts.push(`${dp.label} %${argIndex + 1}`);
      args.push({
        type: "field_input",
        name: fieldName,
        text: "",
      });
    }
    argIndex++;
  }

  blockDef.message0 = messageParts.join("\n");
  blockDef.args0 = args;

  // Statement inputs (containment properties)
  let extraMessageIndex = 1;
  for (const op of classObjectProps) {
    if (CONTAINMENT_PROPERTIES.includes(op.id)) {
      const inputName = op.id.replace("dhc:", "").toUpperCase();
      const msgKey = `message${extraMessageIndex}`;
      const argsKey = `args${extraMessageIndex}`;
      blockDef[msgKey] = `${op.label} %1`;
      blockDef[argsKey] = [
        {
          type: "input_statement",
          name: inputName,
          check: op.range ? op.range.replace("dhc:", "dhc_") : null,
        },
      ];
      extraMessageIndex++;
    }
  }

  // Value inputs (reference properties)
  for (const op of classObjectProps) {
    if (REFERENCE_PROPERTIES.includes(op.id)) {
      const inputName = op.id.replace("dhc:", "").toUpperCase();
      const msgKey = `message${extraMessageIndex}`;
      const argsKey = `args${extraMessageIndex}`;
      blockDef[msgKey] = `${op.label} %1`;
      blockDef[argsKey] = [
        {
          type: "input_value",
          name: inputName,
          check: op.range ? op.range.replace("dhc:", "dhc_") : null,
        },
      ];
      extraMessageIndex++;
    }
  }

  // Allow previous connection (can be nested inside a parent)
  blockDef.previousStatement = blockType;
  // Allow next connection (siblings in a statement list)
  blockDef.nextStatement = null;

  // Equipment subclasses can appear in multiple contexts
  if (
    cls.superClass === "dhc:Equipment" ||
    classId === "dhc:Equipment"
  ) {
    blockDef.previousStatement = "dhc_Equipment";
  }

  blocklyBlocks.push(blockDef);

  // Add to toolbox category
  const categoryKey = effectiveView;
  if (!toolboxCategories[categoryKey]) {
    toolboxCategories[categoryKey] = [];
  }
  toolboxCategories[categoryKey].push({
    kind: "block",
    type: blockType,
  });
}

// Build the categoryToolbox structure
const toolboxConfig = {
  kind: "categoryToolbox",
  contents: [],
};

// Order: spatial, electrical, shared (matching scope)
const categoryOrder = ["spatial", "electrical", "shared"];
for (const viewKey of categoryOrder) {
  if (toolboxCategories[viewKey]) {
    toolboxConfig.contents.push({
      kind: "category",
      name: VIEW_LABELS[viewKey] || viewKey,
      colour: VIEW_COLOURS[viewKey] || 0,
      contents: toolboxCategories[viewKey],
    });
  }
}

// Add any remaining categories not in the order
for (const viewKey of Object.keys(toolboxCategories)) {
  if (!categoryOrder.includes(viewKey)) {
    toolboxConfig.contents.push({
      kind: "category",
      name: VIEW_LABELS[viewKey] || viewKey,
      colour: VIEW_COLOURS[viewKey] || 0,
      contents: toolboxCategories[viewKey],
    });
  }
}

// Write output files
fs.writeFileSync(BLOCKS_OUT, JSON.stringify(blocklyBlocks, null, 2));
fs.writeFileSync(TOOLBOX_OUT, JSON.stringify(toolboxConfig, null, 2));

console.log(`Generated ${blocklyBlocks.length} Blockly block definitions`);
console.log(
  `Toolbox categories: ${toolboxConfig.contents.map((c) => c.name).join(", ")}`
);
console.log(`Output: ${BLOCKS_OUT}`);
console.log(`Output: ${TOOLBOX_OUT}`);
