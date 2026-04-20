import { describe, it, expect } from "vitest";
import { parseGraphs } from "../../src/utils/ttlParser.js";
import { MINI_TBOX_TTL, MINI_CBOX_TTL, MINI_PROFILE } from "../_helpers/fixtures.js";

function parseMini() {
  return parseGraphs({
    tboxTtls: [{ name: "core", ttl: MINI_TBOX_TTL }],
    cboxTtls: [{ profile: MINI_PROFILE, ttl: MINI_CBOX_TTL }],
  });
}

describe("parseGraphs — T-Box view", () => {
  it("extracts owl:versionInfo", () => {
    const { tbox } = parseMini();
    expect(tbox.version).toBe("2.1.0");
  });

  it("finds all five classes with trilingual labels", () => {
    const { tbox } = parseMini();
    const names = tbox.classes.map((c) => c.localName).sort();
    expect(names).toEqual([
      "Circuit",
      "CircuitType",
      "Equipment",
      "Group",
      "Space",
    ]);
    const circuit = tbox.classes.find((c) => c.localName === "Circuit");
    expect(circuit.label).toEqual({
      en: "Circuit",
      de: "Stromkreis",
      fr: "Circuit",
    });
  });

  it("captures blocklyDisposition + blocklyParentProperty on Circuit", () => {
    const { tbox } = parseMini();
    const circuit = tbox.classes.find((c) => c.localName === "Circuit");
    expect(circuit.designView).toBe("electrical");
    expect(circuit.blocklyDisposition).toBe("block");
    expect(circuit.blocklyParentProperty).toMatch(/hasCircuit$/);
  });

  it("captures object/data property counts", () => {
    const { tbox } = parseMini();
    // hasCircuit + hasCircuitType + blocklyParentProperty (declared in fixture)
    expect(tbox.objectProperties.length).toBe(3);
    // ratedCurrent + designView + blocklyDisposition (declared in fixture)
    expect(tbox.dataProperties.length).toBe(3);
  });

  it("extracts enum instances keyed by class IRI", () => {
    const { tbox } = parseMini();
    const typeIri = "https://digitalhome.cloud/ontology#CircuitType";
    const enums = tbox.enumInstancesByClass[typeIri];
    expect(enums).toBeTruthy();
    expect(enums.map((e) => e.localName).sort()).toEqual([
      "CircuitType_Lighting",
      "CircuitType_Socket",
    ]);
    expect(enums[0].label.de).toBeTruthy();
  });
});

describe("parseGraphs — C-Box view", () => {
  it("parses one profile with one shape", () => {
    const { cbox } = parseMini();
    expect(cbox.length).toBe(1);
    expect(cbox[0].id).toBe("nfc15100");
    expect(cbox[0].shapes.length).toBe(1);
  });

  it("splits sh:or branches into guard + constraint kinds", () => {
    const { cbox } = parseMini();
    const shape = cbox[0].shapes[0];
    const kinds = shape.orBranches.map((b) => b.kind).sort();
    expect(kinds).toEqual(["constraint", "guard"]);
  });

  it("extracts guard hasValue pointing at CircuitType_Lighting", () => {
    const { cbox } = parseMini();
    const shape = cbox[0].shapes[0];
    const guard = shape.orBranches.find((b) => b.kind === "guard");
    expect(guard.guards[0].hasValue).toMatch(/CircuitType_Lighting$/);
  });

  it("coerces numeric dhc:defaultValue from xsd literals", () => {
    const { cbox } = parseMini();
    const shape = cbox[0].shapes[0];
    const branch = shape.orBranches.find((b) => b.kind === "constraint");
    const prop = branch.constraints[0];
    expect(prop.defaultValue).toBe(10);
    expect(prop.maxInclusive).toBe("16");
    expect(prop.messages.en).toMatch(/Lighting/);
  });
});
