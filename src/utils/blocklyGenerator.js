/**
 * Blockly block + toolbox generator for the v2 Multi-Box ontology.
 *
 * Input: the structured T-Box / C-Box views produced by parseGraphs().
 * Output: { blocks, toolbox } consumed by the Modeler Builder page and
 * published to S3 for downstream apps.
 *
 * All overrides in v1's blockly-overrides.json are now derivable from T-Box
 * (dhc:designView, dhc:blocklyDisposition, dhc:blocklyParentProperty,
 * dhc:blocklyFieldType, rdfs:label) and C-Box (dhc:defaultValue, shape
 * constraints and messages).
 */

import { DHC } from "./ttlParser";

const XSD = "http://www.w3.org/2001/XMLSchema#";

// designView → default Blockly disposition when a class does not carry an
// explicit dhc:blocklyDisposition (spec DH-SPEC-201 §8.1).
const DEFAULT_DISPOSITION_BY_VIEW = {
  spatial: "excluded",
  governance: "excluded",
  compliance: "excluded",
  automation: "variable",
  building: "block",
  electrical: "block",
  plumbing: "block",
  heating: "block",
  network: "block",
};

// Fixed palette — UI concern, not T-Box data.
export const VIEW_COLOURS = {
  spatial: 142,
  building: 36,
  electrical: 220,
  plumbing: 186,
  heating: 0,
  network: 270,
  governance: 25,
  automation: 330,
};

export const VIEW_LABELS = {
  spatial: "Spatial",
  building: "Building",
  electrical: "Electrical",
  plumbing: "Plumbing",
  heating: "Heating / HVAC",
  network: "Network",
  governance: "Governance",
  automation: "Automation",
};

const XSD_FIELD_TYPE = {
  [`${XSD}string`]: "text",
  [`${XSD}integer`]: "number",
  [`${XSD}decimal`]: "number",
  [`${XSD}double`]: "number",
  [`${XSD}float`]: "number",
  [`${XSD}boolean`]: "checkbox",
  [`${XSD}dateTime`]: "text",
};

function localName(iri) {
  if (!iri) return null;
  return iri.startsWith(DHC) ? iri.slice(DHC.length) : iri;
}

function snakeCase(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();
}

export function classIdToBlockType(classIri) {
  return `dhc_${snakeCase(localName(classIri))}`;
}

function effectiveDisposition(cls) {
  if (cls.blocklyDisposition) return cls.blocklyDisposition;
  if (cls.designView && DEFAULT_DISPOSITION_BY_VIEW[cls.designView]) {
    return DEFAULT_DISPOSITION_BY_VIEW[cls.designView];
  }
  return "excluded";
}

function effectiveView(cls) {
  return cls.blocklyCategory || cls.designView || null;
}

function fieldTypeForProperty(prop) {
  if (prop.blocklyFieldType) return prop.blocklyFieldType;
  if (prop.range && XSD_FIELD_TYPE[prop.range]) return XSD_FIELD_TYPE[prop.range];
  return "text";
}

// ──── C-Box overlay ─────────────────────────────────────────────────────

/**
 * Distil a shape's orBranches into one or more { condition, constraints,
 * defaults, messages } entries per guard/constraint pair.
 *
 * P3 pattern layout (per CLAUDE.md):
 *   sh:or (
 *     [ sh:not [ sh:property [ sh:path X ; sh:hasValue Y ] ] ]   ← guard
 *     [ sh:property [ ... ] ;  sh:property [ ... ] ]              ← constraints
 *   )
 *
 * The guard branch's `sh:not` wraps the *positive* condition, so the shape
 * applies iff (path X = value Y). We surface that as { path, equals }.
 */
function extractConditions(shape) {
  // Collect conditions from every guard branch. Multiple guards = AND.
  const conditions = [];
  for (const b of shape.orBranches) {
    if (b.kind !== "guard") continue;
    for (const g of b.guards) {
      if (g.hasValue) {
        conditions.push({
          path: localName(g.path),
          equals: g.hasValue.startsWith(DHC)
            ? `dhc:${localName(g.hasValue)}`
            : g.hasValue,
        });
      }
    }
  }
  return conditions;
}

function extractConstraints(shape) {
  // Merge all constraint branches — we treat them as a single AND group;
  // P3 uses one constraint branch per shape in practice.
  const merged = [];
  for (const b of shape.orBranches) {
    if (b.kind !== "constraint") continue;
    merged.push(...b.constraints);
  }
  // Also count direct sh:property nodes (unguarded shapes).
  merged.push(...shape.properties);
  return merged;
}

function shapeOverlay(shape) {
  const conditions = extractConditions(shape);
  const constraints = extractConstraints(shape);

  const flatConstraints = [];
  const defaults = {};
  const messages = {};

  for (const c of constraints) {
    const pathName = localName(c.path);
    if (!pathName) continue;
    const entry = { path: pathName };

    if (c.minInclusive !== null) entry.minInclusive = Number(c.minInclusive);
    if (c.maxInclusive !== null) entry.maxInclusive = Number(c.maxInclusive);
    if (c.minExclusive !== null) entry.minExclusive = Number(c.minExclusive);
    if (c.maxExclusive !== null) entry.maxExclusive = Number(c.maxExclusive);
    if (c.minCount !== null) entry.minCount = Number(c.minCount);
    if (c.maxCount !== null) entry.maxCount = Number(c.maxCount);
    if (c.datatype) entry.datatype = c.datatype;
    if (c.class) entry.class = c.class;
    if (c.hasValue) {
      entry.hasValue = c.hasValue.startsWith(DHC)
        ? `dhc:${localName(c.hasValue)}`
        : c.hasValue;
    }
    if (c.in) entry.in = c.in;

    flatConstraints.push(entry);

    if (c.defaultValue !== null && c.defaultValue !== undefined) {
      defaults[pathName] = c.defaultValue;
    }
    if (c.messages && Object.keys(c.messages).length > 0) {
      messages[pathName] = c.messages;
    }
  }

  return {
    shapeId: localName(shape.id),
    condition: conditions.length === 1 ? conditions[0] : conditions,
    constraints: flatConstraints,
    defaults,
    messages,
  };
}

function normConstraintsForClass(classIri, cbox) {
  const entries = [];
  for (const profile of cbox) {
    for (const shape of profile.shapes) {
      if (shape.targetClass !== classIri) continue;
      const overlay = shapeOverlay(shape);
      if (
        overlay.constraints.length === 0 &&
        Object.keys(overlay.defaults).length === 0
      ) {
        continue;
      }
      entries.push({
        norm: profile.id,
        normLabel: profile.label,
        ...overlay,
      });
    }
  }
  return entries;
}

// ──── Block generation ──────────────────────────────────────────────────

function dropdownOptionsFromEnum(enumInstances) {
  return enumInstances.map((inst) => ({
    value: `dhc:${inst.localName}`,
    label: inst.label || { en: inst.localName },
  }));
}

function fieldsForClass(cls, tbox) {
  const fields = [];
  const dataProps = tbox.dataProperties.filter((p) => p.domain === cls.id);
  for (const p of dataProps) {
    fields.push({
      name: snakeCase(p.localName).toUpperCase(),
      property: `dhc:${p.localName}`,
      label: p.label,
      type: fieldTypeForProperty(p),
      range: p.range,
    });
  }
  // Enum-typed object properties (range class has enum instances) → dropdown.
  const objProps = tbox.objectProperties.filter((p) => p.domain === cls.id);
  for (const p of objProps) {
    const enumInstances = tbox.enumInstancesByClass[p.range];
    if (enumInstances && enumInstances.length > 0) {
      fields.push({
        name: snakeCase(p.localName).toUpperCase(),
        property: `dhc:${p.localName}`,
        label: p.label,
        type: "dropdown",
        options: dropdownOptionsFromEnum(enumInstances),
      });
    }
  }
  return fields;
}

function connectionsForClass(cls, tbox) {
  const children = tbox.objectProperties
    .filter((p) => p.domain === cls.id)
    .filter((p) => !tbox.enumInstancesByClass[p.range])
    .map((p) => ({
      property: `dhc:${p.localName}`,
      range: p.range ? `dhc:${localName(p.range)}` : null,
      label: p.label,
    }));

  const parent = cls.blocklyParentProperty
    ? `dhc:${localName(cls.blocklyParentProperty)}`
    : null;

  return { parent, children };
}

/**
 * Generate Blockly block + toolbox artifacts from the v2 bundle.
 *
 * @param {{ tbox: Object, cbox: Array }} params
 * @returns {{ blocks: Array, toolbox: Object }}
 */
export function generateBlocklyArtifacts({ tbox, cbox }) {
  const blocks = [];
  const toolboxByCategory = {};

  for (const cls of tbox.classes) {
    const disposition = effectiveDisposition(cls);
    if (disposition === "excluded") continue;

    const view = effectiveView(cls) || "automation";
    const colour = VIEW_COLOURS[view] ?? 230;
    const blockType = classIdToBlockType(cls.id);

    const block = {
      type: blockType,
      ontologyClass: `dhc:${cls.localName}`,
      designView: view,
      disposition,
      colour,
      label: cls.label,
      tooltip: cls.comment || cls.label?.en || cls.localName,
      fields: fieldsForClass(cls, tbox),
      connections: connectionsForClass(cls, tbox),
      normConstraints: normConstraintsForClass(cls.id, cbox),
    };

    blocks.push(block);

    if (!toolboxByCategory[view]) toolboxByCategory[view] = [];
    toolboxByCategory[view].push({ kind: "block", type: blockType });
  }

  const categoryOrder = [
    "spatial",
    "building",
    "electrical",
    "plumbing",
    "heating",
    "network",
    "automation",
    "governance",
  ];
  const contents = [];
  for (const view of categoryOrder) {
    if (!toolboxByCategory[view]) continue;
    contents.push({
      kind: "category",
      name: VIEW_LABELS[view] || view,
      colour: VIEW_COLOURS[view] ?? 230,
      contents: toolboxByCategory[view],
    });
  }
  // Emit any view that slipped the order list.
  for (const view of Object.keys(toolboxByCategory)) {
    if (categoryOrder.includes(view)) continue;
    contents.push({
      kind: "category",
      name: VIEW_LABELS[view] || view,
      colour: VIEW_COLOURS[view] ?? 230,
      contents: toolboxByCategory[view],
    });
  }

  const variables = blocks
    .filter((b) => b.disposition === "variable")
    .map((b) => ({
      type: b.type,
      ontologyClass: b.ontologyClass,
      label: b.label,
      designView: b.designView,
    }));

  return {
    blocks,
    toolbox: { kind: "categoryToolbox", contents, variables },
  };
}
