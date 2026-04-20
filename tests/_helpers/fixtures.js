/**
 * Minimal T-Box + C-Box fixtures for isolated generator tests.
 * These TTL strings are hand-crafted to exercise the parser/generator
 * behaviours without pulling in the full 60-class v2 ontology.
 */

export const MINI_TBOX_TTL = `
@prefix dhc:  <https://digitalhome.cloud/ontology#> .
@prefix owl:  <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .

<https://digitalhome.cloud/ontology>
  a owl:Ontology ;
  owl:versionInfo "2.1.0" .

dhc:designView a owl:DatatypeProperty .
dhc:blocklyDisposition a owl:DatatypeProperty .
dhc:blocklyParentProperty a owl:ObjectProperty .

# A block-producing class with an explicit parent property.
dhc:Circuit a owl:Class ;
  rdfs:label "Circuit"@en, "Stromkreis"@de, "Circuit"@fr ;
  rdfs:comment "An electrical circuit."@en ;
  dhc:designView "electrical" ;
  dhc:blocklyDisposition "block" ;
  dhc:blocklyParentProperty dhc:hasCircuit .

# A class expected to fall through to the designView-default mapping.
dhc:Equipment a owl:Class ;
  rdfs:label "Equipment"@en, "Gerät"@de, "Équipement"@fr ;
  dhc:designView "electrical" .

# A class expected to be excluded (spatial → excluded).
dhc:Space a owl:Class ;
  rdfs:label "Space"@en, "Raum"@de, "Espace"@fr ;
  dhc:designView "spatial" .

# A class that becomes a variable (automation → variable).
dhc:Group a owl:Class ;
  rdfs:label "Group"@en, "Gruppe"@de, "Groupe"@fr ;
  dhc:designView "automation" .

# Enum class with two instances.
dhc:CircuitType a owl:Class ;
  rdfs:label "Circuit Type"@en .

dhc:CircuitType_Lighting a dhc:CircuitType ;
  rdfs:label "Lighting"@en, "Beleuchtung"@de, "Éclairage"@fr .

dhc:CircuitType_Socket a dhc:CircuitType ;
  rdfs:label "Socket"@en, "Steckdose"@de, "Prise"@fr .

# Properties.
dhc:hasCircuit a owl:ObjectProperty ;
  rdfs:label "has circuit"@en ;
  rdfs:domain dhc:Equipment ;
  rdfs:range dhc:Circuit .

dhc:hasCircuitType a owl:ObjectProperty ;
  rdfs:label "has circuit type"@en ;
  rdfs:domain dhc:Circuit ;
  rdfs:range dhc:CircuitType .

dhc:ratedCurrent a owl:DatatypeProperty ;
  rdfs:label "rated current"@en ;
  rdfs:domain dhc:Circuit ;
  rdfs:range xsd:decimal .
`;

export const MINI_CBOX_TTL = `
@prefix dhc:      <https://digitalhome.cloud/ontology#> .
@prefix nfc15100: <https://digitalhome.cloud/ontology/cbox/nfc15100#> .
@prefix sh:       <http://www.w3.org/ns/shacl#> .
@prefix xsd:      <http://www.w3.org/2001/XMLSchema#> .

nfc15100:LightingCircuitShape
  a sh:NodeShape ;
  sh:targetClass dhc:Circuit ;
  dhc:normId "nfc15100" ;
  sh:or (
    [ sh:not [ sh:property [
        sh:path dhc:hasCircuitType ;
        sh:hasValue dhc:CircuitType_Lighting ] ] ]
    [ sh:property [
        sh:path dhc:ratedCurrent ;
        sh:maxInclusive 16 ;
        dhc:defaultValue 10 ;
        sh:message "Lighting circuits default to 10A"@en ] ]
  ) .
`;

export const MINI_PROFILE = {
  id: "nfc15100",
  file: "electrical/nfc15100.shapes.ttl",
  label: { en: "NF C 15-100", de: "NF C 15-100", fr: "NF C 15-100" },
  country: "FR",
  domain: "electrical",
  version: "2.1.0",
  norm: "dhc:Norm_NFC15100",
  requires: [],
};
