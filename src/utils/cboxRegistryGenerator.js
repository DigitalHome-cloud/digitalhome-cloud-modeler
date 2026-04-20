/**
 * Builds cbox-registry.json — the consumer-facing summary of every norm
 * profile's shapes, defaults, and messages.
 *
 * Published to S3 alongside blockly-blocks.json. Designer fetches it at
 * runtime to decide which norms a project must satisfy and to surface
 * validation messages inline in the Blockly workspace.
 */

import { DHC } from "./ttlParser";

function localName(iri) {
  if (!iri) return null;
  return iri.startsWith(DHC) ? iri.slice(DHC.length) : iri;
}

function normaliseIri(iri) {
  if (!iri) return null;
  return iri.startsWith(DHC) ? `dhc:${iri.slice(DHC.length)}` : iri;
}

function extractConditions(shape) {
  const conditions = [];
  for (const b of shape.orBranches) {
    if (b.kind !== "guard") continue;
    for (const g of b.guards) {
      if (g.hasValue) {
        conditions.push({
          path: localName(g.path),
          equals: normaliseIri(g.hasValue),
        });
      }
    }
  }
  return conditions;
}

function flattenConstraints(shape) {
  const all = [];
  for (const b of shape.orBranches) {
    if (b.kind === "constraint") all.push(...b.constraints);
  }
  all.push(...shape.properties);

  const flatConstraints = [];
  const defaults = {};
  const messages = {};

  for (const c of all) {
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
    if (c.class) entry.class = normaliseIri(c.class);
    if (c.hasValue) entry.hasValue = normaliseIri(c.hasValue);
    if (c.in) entry.in = c.in.map(normaliseIri);

    flatConstraints.push(entry);

    if (c.defaultValue !== null && c.defaultValue !== undefined) {
      defaults[pathName] = c.defaultValue;
    }
    if (c.messages && Object.keys(c.messages).length > 0) {
      messages[pathName] = c.messages;
    }
  }

  return { constraints: flatConstraints, defaults, messages };
}

/**
 * @param {{ cbox: Array, registryVersion?: string }} params
 * @returns {Object}
 */
export function buildCboxRegistry({ cbox, registryVersion }) {
  const profiles = cbox.map((profile) => {
    const targetClasses = [
      ...new Set(
        profile.shapes
          .map((s) => (s.targetClass ? `dhc:${localName(s.targetClass)}` : null))
          .filter(Boolean)
      ),
    ];

    const shapes = profile.shapes.map((shape) => {
      const conditions = extractConditions(shape);
      const { constraints, defaults, messages } = flattenConstraints(shape);
      return {
        id: localName(shape.id) || shape.id,
        label: shape.label,
        targetClass: shape.targetClass
          ? `dhc:${localName(shape.targetClass)}`
          : null,
        condition:
          conditions.length === 0
            ? null
            : conditions.length === 1
              ? conditions[0]
              : conditions,
        constraints,
        defaults,
        messages,
      };
    });

    return {
      id: profile.id,
      label: profile.label,
      country: profile.country,
      domain: profile.domain,
      version: profile.version,
      norm: profile.norm,
      requires: profile.requires || [],
      targetClasses,
      shapes,
    };
  });

  return {
    version: registryVersion || "1.0.0",
    generatedAt: new Date().toISOString(),
    profiles,
  };
}
