import { describe, it, expect } from "vitest";
import { parseGraphs } from "../../src/utils/ttlParser.js";
import {
  generateBlocklyArtifacts,
  classIdToBlockType,
} from "../../src/utils/blocklyGenerator.js";
import { MINI_TBOX_TTL, MINI_CBOX_TTL, MINI_PROFILE } from "../_helpers/fixtures.js";

function build() {
  const { tbox, cbox } = parseGraphs({
    tboxTtls: [{ name: "core", ttl: MINI_TBOX_TTL }],
    cboxTtls: [{ profile: MINI_PROFILE, ttl: MINI_CBOX_TTL }],
  });
  return generateBlocklyArtifacts({ tbox, cbox });
}

describe("generateBlocklyArtifacts", () => {
  it("emits exactly Circuit, Equipment, Group — Space + CircuitType are excluded", () => {
    const { blocks } = build();
    const ontologyClasses = blocks.map((b) => b.ontologyClass).sort();
    expect(ontologyClasses).toEqual([
      "dhc:Circuit",
      "dhc:Equipment",
      "dhc:Group",
    ]);
  });

  it("maps Circuit → block, Group → variable, Equipment → block via designView fallback", () => {
    const { blocks } = build();
    const byClass = Object.fromEntries(
      blocks.map((b) => [b.ontologyClass, b.disposition])
    );
    expect(byClass["dhc:Circuit"]).toBe("block");
    expect(byClass["dhc:Group"]).toBe("variable");
    expect(byClass["dhc:Equipment"]).toBe("block");
  });

  it("Circuit block carries a dropdown field for hasCircuitType (enum range)", () => {
    const { blocks } = build();
    const circuit = blocks.find((b) => b.ontologyClass === "dhc:Circuit");
    const dropdown = circuit.fields.find((f) => f.type === "dropdown");
    expect(dropdown).toBeTruthy();
    expect(dropdown.options.length).toBe(2);
    expect(dropdown.options.map((o) => o.value).sort()).toEqual([
      "dhc:CircuitType_Lighting",
      "dhc:CircuitType_Socket",
    ]);
  });

  it("Circuit block carries a number field for ratedCurrent", () => {
    const { blocks } = build();
    const circuit = blocks.find((b) => b.ontologyClass === "dhc:Circuit");
    const num = circuit.fields.find((f) => f.type === "number");
    expect(num).toBeTruthy();
    expect(num.property).toBe("dhc:ratedCurrent");
  });

  it("Circuit normConstraints overlay includes the Lighting guard + default", () => {
    const { blocks } = build();
    const circuit = blocks.find((b) => b.ontologyClass === "dhc:Circuit");
    expect(circuit.normConstraints.length).toBe(1);
    const entry = circuit.normConstraints[0];
    expect(entry.norm).toBe("nfc15100");
    expect(entry.condition).toMatchObject({
      path: "hasCircuitType",
      equals: "dhc:CircuitType_Lighting",
    });
    expect(entry.defaults).toEqual({ ratedCurrent: 10 });
  });

  it("toolbox groups blocks into Electrical + Automation categories", () => {
    const { toolbox } = build();
    const names = toolbox.contents.map((c) => c.name);
    expect(names).toContain("Electrical");
    expect(names).toContain("Automation");
  });

  it("classIdToBlockType produces snake_case block types", () => {
    expect(classIdToBlockType("https://digitalhome.cloud/ontology#Circuit")).toBe(
      "dhc_circuit"
    );
    expect(
      classIdToBlockType("https://digitalhome.cloud/ontology#CircuitType_Lighting")
    ).toBe("dhc_circuit_type_lighting");
  });
});
