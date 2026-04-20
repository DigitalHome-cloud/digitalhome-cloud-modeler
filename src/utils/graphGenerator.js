/**
 * Builds ontology-graph.json from the v2 T-Box/C-Box views.
 *
 * Consumed by the 3D force-graph in WorkspaceShell and — once published to
 * S3 — by downstream apps. Nodes represent classes and enum instances;
 * edges represent ObjectProperties (domain → range) and subclass relations.
 * Each governed class is annotated with the list of norms that constrain it.
 */

import { DHC } from "./ttlParser";

function localName(iri) {
  if (!iri) return null;
  return iri.startsWith(DHC) ? iri.slice(DHC.length) : iri;
}

function governedByNormsFor(classIri, cbox) {
  const norms = new Set();
  for (const profile of cbox) {
    for (const shape of profile.shapes) {
      if (shape.targetClass === classIri) {
        norms.add(profile.id);
        break;
      }
    }
  }
  return [...norms];
}

/**
 * @param {{ tbox: Object, cbox: Array }} params
 * @returns {{ version: string, nodes: Array, links: Array }}
 */
export function buildOntologyGraph({ tbox, cbox }) {
  const nodes = [];
  const links = [];

  for (const cls of tbox.classes) {
    nodes.push({
      id: `dhc:${cls.localName}`,
      label: cls.label,
      designView: cls.designView,
      type: "class",
      superClass: cls.superClass ? `dhc:${localName(cls.superClass)}` : null,
      governedByNorms: governedByNormsFor(cls.id, cbox),
    });

    if (cls.superClass) {
      links.push({
        source: `dhc:${cls.localName}`,
        target: `dhc:${localName(cls.superClass)}`,
        property: "rdfs:subClassOf",
        label: { en: "is a", de: "ist ein", fr: "est un" },
      });
    }
  }

  for (const [classIri, instances] of Object.entries(
    tbox.enumInstancesByClass
  )) {
    for (const inst of instances) {
      nodes.push({
        id: `dhc:${inst.localName}`,
        label: inst.label,
        type: "enumInstance",
        ofClass: `dhc:${localName(classIri)}`,
      });
    }
  }

  for (const p of tbox.objectProperties) {
    if (!p.domain || !p.range) continue;
    links.push({
      source: `dhc:${localName(p.domain)}`,
      target: `dhc:${localName(p.range)}`,
      property: `dhc:${p.localName}`,
      label: p.label,
    });
  }

  return {
    version: tbox.version,
    nodes,
    links,
  };
}
