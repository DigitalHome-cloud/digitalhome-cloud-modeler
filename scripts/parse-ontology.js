#!/usr/bin/env node
/**
 * parse-ontology.js
 *
 * Reads dhc-core.schema.ttl and produces src/data/ontology-graph.json
 * with { nodes, links } for the 3D force-graph viewer.
 */

const fs = require("fs");
const path = require("path");

const TTL_PATH = path.resolve(
  __dirname,
  "../../digitalhome-cloud-semantic-core/ontology/dhc-core.schema.ttl"
);
const OUT_PATH = path.resolve(__dirname, "../src/data/ontology-graph.json");

const ttl = fs.readFileSync(TTL_PATH, "utf-8");

// Split into blocks separated by blank lines
const blocks = ttl.split(/\n\s*\n/);

const nodes = [];
const links = [];
const nodeIds = new Set();

function stripLang(val) {
  return val.replace(/@\w+$/, "").replace(/^"|"$/g, "");
}

function extractField(block, predicate) {
  // Match single-line triples like:  rdfs:label "Foo"@en ;
  const re = new RegExp(predicate + '\\s+"([^"]*)"(?:@en)?', "m");
  const m = block.match(re);
  return m ? m[1] : null;
}

function extractObject(block, predicate) {
  // Match object references like:  rdfs:domain dhc:Space ;
  const re = new RegExp(predicate + "\\s+(\\S+?)\\s*[;.]", "m");
  const m = block.match(re);
  return m ? m[1] : null;
}

function extractDesignView(block) {
  const m = block.match(/dhc:designView\s+"([^"]+)"/);
  return m ? m[1] : null;
}

function getSubjectAndType(block) {
  // Match: dhc:Something\n  a owl:Class ;
  const m = block.match(/^(dhc:\w+)\s*\n?\s+a\s+(owl:\w+)/m);
  if (!m) return null;
  return { id: m[1], owlType: m[2] };
}

// Also handle compact one-liners like: dhc:Socket a owl:Class ; rdfs:subClassOf ...
function getSubjectAndTypeCompact(block) {
  const m = block.match(/^(dhc:\w+)\s+a\s+(owl:\w+)\s*;/m);
  if (!m) return null;
  return { id: m[1], owlType: m[2] };
}

for (const block of blocks) {
  const trimmed = block.trim();
  if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("@prefix") || trimmed.startsWith("<")) {
    continue;
  }

  const parsed = getSubjectAndType(trimmed) || getSubjectAndTypeCompact(trimmed);
  if (!parsed) continue;

  const { id, owlType } = parsed;

  // Skip the designView annotation property definition itself
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
    case "owl:AnnotationProperty":
      type = "annotationProperty";
      break;
    default:
      type = owlType;
  }

  const node = { id, label, type };
  if (view) node.view = view;
  if (comment) node.comment = comment;
  if (superClass) node.superClass = superClass;
  if (domain) node.domain = domain;
  if (range) node.range = range;

  nodes.push(node);
  nodeIds.add(id);
}

// Build links
for (const node of nodes) {
  // subClassOf links
  if (node.superClass && nodeIds.has(node.superClass)) {
    links.push({
      source: node.id,
      target: node.superClass,
      label: "subClassOf",
      type: "subClassOf",
    });
  }

  // Object property → domain/range links
  if (node.type === "objectProperty") {
    if (node.domain && nodeIds.has(node.domain) && node.range && nodeIds.has(node.range)) {
      links.push({
        source: node.domain,
        target: node.range,
        label: node.label,
        type: "objectProperty",
      });
    }
  }

  // Datatype property → domain link
  if (node.type === "datatypeProperty" && node.domain && nodeIds.has(node.domain)) {
    links.push({
      source: node.id,
      target: node.domain,
      label: "domain",
      type: "domain",
    });
  }
}

const graph = { nodes, links };

fs.writeFileSync(OUT_PATH, JSON.stringify(graph, null, 2));

console.log(
  `Parsed ${nodes.filter((n) => n.type === "class").length} classes, ` +
    `${nodes.filter((n) => n.type === "objectProperty").length} object properties, ` +
    `${nodes.filter((n) => n.type === "datatypeProperty").length} datatype properties`
);
console.log(`${links.length} links generated`);
console.log(`Output: ${OUT_PATH}`);
