/**
 * RDF parser for the v2 Multi-Box ontology.
 * Uses N3.js — replaces the v1 regex parser (could not handle SHACL sh:or
 * nested blank nodes).
 */
import { Parser, Store, DataFactory } from "n3";

const { namedNode } = DataFactory;

const DHC = "https://digitalhome.cloud/ontology#";
const OWL = "http://www.w3.org/2002/07/owl#";
const RDF = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
const RDFS = "http://www.w3.org/2000/01/rdf-schema#";
const SHACL = "http://www.w3.org/ns/shacl#";
const XSD = "http://www.w3.org/2001/XMLSchema#";

const IRI = {
  Class: `${OWL}Class`,
  ObjectProperty: `${OWL}ObjectProperty`,
  DatatypeProperty: `${OWL}DatatypeProperty`,
  AnnotationProperty: `${OWL}AnnotationProperty`,
  type: `${RDF}type`,
  label: `${RDFS}label`,
  comment: `${RDFS}comment`,
  subClassOf: `${RDFS}subClassOf`,
  domain: `${RDFS}domain`,
  range: `${RDFS}range`,
  versionInfo: `${OWL}versionInfo`,
  designView: `${DHC}designView`,
  blocklyDisposition: `${DHC}blocklyDisposition`,
  blocklyCategory: `${DHC}blocklyCategory`,
  blocklyParentProperty: `${DHC}blocklyParentProperty`,
  blocklyFieldType: `${DHC}blocklyFieldType`,
  defaultValue: `${DHC}defaultValue`,
  normId: `${DHC}normId`,
  shTargetClass: `${SHACL}targetClass`,
  shNodeShape: `${SHACL}NodeShape`,
  shProperty: `${SHACL}property`,
  shPath: `${SHACL}path`,
  shHasValue: `${SHACL}hasValue`,
  shMinCount: `${SHACL}minCount`,
  shMaxCount: `${SHACL}maxCount`,
  shMinInclusive: `${SHACL}minInclusive`,
  shMaxInclusive: `${SHACL}maxInclusive`,
  shMinExclusive: `${SHACL}minExclusive`,
  shMaxExclusive: `${SHACL}maxExclusive`,
  shDatatype: `${SHACL}datatype`,
  shClass: `${SHACL}class`,
  shIn: `${SHACL}in`,
  shMessage: `${SHACL}message`,
  shOr: `${SHACL}or`,
  shNot: `${SHACL}not`,
  rdfFirst: `${RDF}first`,
  rdfRest: `${RDF}rest`,
  rdfNil: `${RDF}nil`,
};

function parseTtlToQuads(ttl, graph) {
  const parser = new Parser();
  const g = graph ? namedNode(graph) : null;
  return parser.parse(ttl).map((q) => {
    if (g) {
      return DataFactory.quad(q.subject, q.predicate, q.object, g);
    }
    return q;
  });
}

function addToStore(store, quads) {
  for (const q of quads) store.addQuad(q);
}

// ──── T-Box view ────────────────────────────────────────────────────────

function collectLabels(store, subjectIri) {
  const labels = {};
  const quads = store.getQuads(namedNode(subjectIri), namedNode(IRI.label), null);
  for (const q of quads) {
    if (q.object.termType === "Literal") {
      const lang = q.object.language || "en";
      labels[lang] = q.object.value;
    }
  }
  return labels;
}

function collectComment(store, subjectIri, lang = "en") {
  const quads = store.getQuads(namedNode(subjectIri), namedNode(IRI.comment), null);
  for (const q of quads) {
    if (q.object.termType === "Literal" && (q.object.language || "en") === lang) {
      return q.object.value;
    }
  }
  return null;
}

function singleObjectValue(store, subject, predicate) {
  const quads = store.getQuads(namedNode(subject), namedNode(predicate), null);
  if (!quads.length) return null;
  return quads[0].object.value;
}

function allSubjectsWithType(store, typeIri) {
  return [
    ...new Set(
      store
        .getQuads(null, namedNode(IRI.type), namedNode(typeIri))
        .map((q) => q.subject.value)
    ),
  ];
}

/**
 * Extract a structured T-Box view from an N3 Store.
 * Store may contain T-Box + C-Box; we filter by subject namespace (dhc:).
 */
function buildTboxView(store) {
  // Ontology-level version is on an owl:Ontology subject.
  let version = null;
  const ontologies = allSubjectsWithType(store, `${OWL}Ontology`);
  for (const o of ontologies) {
    const v = singleObjectValue(store, o, IRI.versionInfo);
    if (v) {
      version = v;
      break;
    }
  }

  const classIris = allSubjectsWithType(store, IRI.Class).filter((s) =>
    s.startsWith(DHC)
  );
  const objPropIris = allSubjectsWithType(store, IRI.ObjectProperty).filter(
    (s) => s.startsWith(DHC)
  );
  const dataPropIris = allSubjectsWithType(store, IRI.DatatypeProperty).filter(
    (s) => s.startsWith(DHC)
  );

  const classes = classIris.map((iri) => ({
    id: iri,
    localName: iri.slice(DHC.length),
    label: collectLabels(store, iri),
    comment: collectComment(store, iri),
    superClass: singleObjectValue(store, iri, IRI.subClassOf),
    designView: singleObjectValue(store, iri, IRI.designView),
    blocklyDisposition: singleObjectValue(store, iri, IRI.blocklyDisposition),
    blocklyCategory: singleObjectValue(store, iri, IRI.blocklyCategory),
    blocklyParentProperty: singleObjectValue(
      store,
      iri,
      IRI.blocklyParentProperty
    ),
  }));

  const objectProperties = objPropIris.map((iri) => ({
    id: iri,
    localName: iri.slice(DHC.length),
    label: collectLabels(store, iri),
    comment: collectComment(store, iri),
    domain: singleObjectValue(store, iri, IRI.domain),
    range: singleObjectValue(store, iri, IRI.range),
    designView: singleObjectValue(store, iri, IRI.designView),
    blocklyParentProperty: singleObjectValue(
      store,
      iri,
      IRI.blocklyParentProperty
    ),
  }));

  const dataProperties = dataPropIris.map((iri) => ({
    id: iri,
    localName: iri.slice(DHC.length),
    label: collectLabels(store, iri),
    comment: collectComment(store, iri),
    domain: singleObjectValue(store, iri, IRI.domain),
    range: singleObjectValue(store, iri, IRI.range),
    designView: singleObjectValue(store, iri, IRI.designView),
    blocklyFieldType: singleObjectValue(store, iri, IRI.blocklyFieldType),
  }));

  // Enum instances: instances of a class where the class itself is a dhc: class.
  // Used to build Blockly dropdowns (e.g., CircuitType_Lighting → "Lighting").
  const enumInstancesByClass = {};
  for (const cls of classes) {
    const instances = allSubjectsWithType(store, cls.id).filter((s) =>
      s.startsWith(DHC)
    );
    if (instances.length > 0) {
      enumInstancesByClass[cls.id] = instances.map((iri) => ({
        id: iri,
        localName: iri.slice(DHC.length),
        label: collectLabels(store, iri),
      }));
    }
  }

  return {
    version,
    classes,
    objectProperties,
    dataProperties,
    enumInstancesByClass,
  };
}

// ──── C-Box view ────────────────────────────────────────────────────────

function collectListItems(store, head) {
  const items = [];
  let current = head;
  while (current && current.termType !== "NamedNode" || (current && current.value !== IRI.rdfNil)) {
    if (!current) break;
    if (current.termType === "NamedNode" && current.value === IRI.rdfNil) break;

    const firstQ = store.getQuads(current, namedNode(IRI.rdfFirst), null);
    const restQ = store.getQuads(current, namedNode(IRI.rdfRest), null);
    if (!firstQ.length || !restQ.length) break;

    items.push(firstQ[0].object);
    current = restQ[0].object;
    if (
      current.termType === "NamedNode" &&
      current.value === IRI.rdfNil
    ) {
      break;
    }
  }
  return items;
}

function collectShMessages(store, subject) {
  const messages = {};
  for (const q of store.getQuads(subject, namedNode(IRI.shMessage), null)) {
    if (q.object.termType === "Literal") {
      const lang = q.object.language || "en";
      messages[lang] = q.object.value;
    }
  }
  return messages;
}

function extractPropertyConstraint(store, propBnode) {
  const constraint = {
    path: null,
    hasValue: null,
    minCount: null,
    maxCount: null,
    minInclusive: null,
    maxInclusive: null,
    minExclusive: null,
    maxExclusive: null,
    datatype: null,
    class: null,
    in: null,
    defaultValue: null,
    messages: {},
  };

  const scalarPreds = [
    ["path", IRI.shPath],
    ["minCount", IRI.shMinCount],
    ["maxCount", IRI.shMaxCount],
    ["minInclusive", IRI.shMinInclusive],
    ["maxInclusive", IRI.shMaxInclusive],
    ["minExclusive", IRI.shMinExclusive],
    ["maxExclusive", IRI.shMaxExclusive],
    ["datatype", IRI.shDatatype],
    ["class", IRI.shClass],
  ];

  for (const [key, pred] of scalarPreds) {
    const quads = store.getQuads(propBnode, namedNode(pred), null);
    if (quads.length) constraint[key] = quads[0].object.value;
  }

  const hasVal = store.getQuads(propBnode, namedNode(IRI.shHasValue), null);
  if (hasVal.length) constraint.hasValue = hasVal[0].object.value;

  const inQ = store.getQuads(propBnode, namedNode(IRI.shIn), null);
  if (inQ.length) {
    constraint.in = collectListItems(store, inQ[0].object).map((t) => t.value);
  }

  const dv = store.getQuads(propBnode, namedNode(IRI.defaultValue), null);
  if (dv.length) {
    const term = dv[0].object;
    constraint.defaultValue =
      term.termType === "Literal"
        ? coerceLiteral(term)
        : term.value;
  }

  constraint.messages = collectShMessages(store, propBnode);

  return constraint;
}

function coerceLiteral(term) {
  if (term.datatype && term.datatype.value === `${XSD}boolean`) {
    return term.value === "true";
  }
  if (
    term.datatype &&
    (term.datatype.value === `${XSD}integer` ||
      term.datatype.value === `${XSD}decimal` ||
      term.datatype.value === `${XSD}double` ||
      term.datatype.value === `${XSD}float`)
  ) {
    const n = Number(term.value);
    return Number.isFinite(n) ? n : term.value;
  }
  return term.value;
}

function buildCboxViewForProfile(store, profile) {
  // In v2 P3 pattern, each NodeShape uses sh:or with guard branches. Each
  // branch contributes either guards (sh:not) or real constraints.
  const shapeIris = [
    ...new Set(
      store
        .getQuads(null, namedNode(IRI.type), namedNode(IRI.shNodeShape))
        .map((q) => q.subject.value)
    ),
  ];

  const shapes = [];
  for (const shapeIri of shapeIris) {
    // Skip shapes that don't belong to this profile — distinguish by
    // dhc:normId matching the profile id.
    const normId = singleObjectValue(store, shapeIri, IRI.normId);
    if (normId !== profile.id) continue;

    const targetClass = singleObjectValue(
      store,
      shapeIri,
      IRI.shTargetClass
    );
    const label = collectLabels(store, shapeIri);

    // Collect direct sh:property blank nodes (shapes without sh:or).
    const directProps = store
      .getQuads(namedNode(shapeIri), namedNode(IRI.shProperty), null)
      .map((q) => extractPropertyConstraint(store, q.object));

    // Collect sh:or branches — each branch may have its own sh:property set,
    // some of which are guards (sh:not) and some real constraints.
    const orQuads = store.getQuads(namedNode(shapeIri), namedNode(IRI.shOr), null);
    const branches = [];
    if (orQuads.length) {
      const branchNodes = collectListItems(store, orQuads[0].object);
      for (const branch of branchNodes) {
        const branchProps = store
          .getQuads(branch, namedNode(IRI.shProperty), null)
          .map((q) => extractPropertyConstraint(store, q.object));
        const notQuads = store.getQuads(branch, namedNode(IRI.shNot), null);
        const guards = [];
        for (const nq of notQuads) {
          const inner = store.getQuads(
            nq.object,
            namedNode(IRI.shProperty),
            null
          );
          for (const innerQ of inner) {
            guards.push(extractPropertyConstraint(store, innerQ.object));
          }
        }
        branches.push({
          kind: guards.length > 0 && branchProps.length === 0 ? "guard" : "constraint",
          guards,
          constraints: branchProps,
        });
      }
    }

    shapes.push({
      id: shapeIri,
      label,
      targetClass,
      normId,
      properties: directProps,
      orBranches: branches,
    });
  }

  return {
    id: profile.id,
    file: profile.file,
    label: profile.label,
    country: profile.country,
    domain: profile.domain,
    version: profile.version,
    norm: profile.norm,
    requires: profile.requires || [],
    shapes,
  };
}

// ──── Public API ────────────────────────────────────────────────────────

/**
 * Parse the full v2 ontology bundle into an N3 Store + structured views.
 *
 * @param {Object} params
 * @param {Array<{name: string, ttl: string}>} params.tboxTtls
 * @param {Array<{profile: Object, ttl: string}>} params.cboxTtls
 * @returns {{ store: Store, tbox: Object, cbox: Array }}
 */
export function parseGraphs({ tboxTtls, cboxTtls }) {
  const store = new Store();

  for (const { name, ttl } of tboxTtls) {
    addToStore(store, parseTtlToQuads(ttl, `urn:dhc:tbox:${name}`));
  }
  for (const { profile, ttl } of cboxTtls) {
    addToStore(store, parseTtlToQuads(ttl, `urn:dhc:cbox:${profile.id}`));
  }

  const tbox = buildTboxView(store);
  const cbox = cboxTtls.map(({ profile }) => buildCboxViewForProfile(store, profile));

  return { store, tbox, cbox };
}

export { DHC, OWL, RDF, RDFS, SHACL, IRI };
