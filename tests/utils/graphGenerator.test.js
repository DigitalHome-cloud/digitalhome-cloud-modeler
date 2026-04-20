import { describe, it, expect } from "vitest";
import { parseGraphs } from "../../src/utils/ttlParser.js";
import { buildOntologyGraph } from "../../src/utils/graphGenerator.js";
import { MINI_TBOX_TTL, MINI_CBOX_TTL, MINI_PROFILE } from "../_helpers/fixtures.js";

function build() {
  const { tbox, cbox } = parseGraphs({
    tboxTtls: [{ name: "core", ttl: MINI_TBOX_TTL }],
    cboxTtls: [{ profile: MINI_PROFILE, ttl: MINI_CBOX_TTL }],
  });
  return buildOntologyGraph({ tbox, cbox });
}

describe("buildOntologyGraph", () => {
  it("emits one node per class + one per enum instance", () => {
    const graph = build();
    const classNodes = graph.nodes.filter((n) => n.type === "class");
    const enumNodes = graph.nodes.filter((n) => n.type === "enumInstance");
    expect(classNodes.length).toBe(5);
    expect(enumNodes.length).toBe(2);
  });

  it("annotates governedByNorms on Circuit only", () => {
    const graph = build();
    const circuit = graph.nodes.find((n) => n.id === "dhc:Circuit");
    const equipment = graph.nodes.find((n) => n.id === "dhc:Equipment");
    expect(circuit.governedByNorms).toEqual(["nfc15100"]);
    expect(equipment.governedByNorms).toEqual([]);
  });

  it("emits a link for every ObjectProperty with domain+range", () => {
    const graph = build();
    const links = graph.links.filter(
      (l) => l.property && l.property.startsWith("dhc:")
    );
    // hasCircuit (Equipment→Circuit), hasCircuitType (Circuit→CircuitType)
    expect(links.length).toBe(2);
    const hasCircuit = links.find((l) => l.property === "dhc:hasCircuit");
    expect(hasCircuit.source).toBe("dhc:Equipment");
    expect(hasCircuit.target).toBe("dhc:Circuit");
  });

  it("passes through tbox.version as graph.version", () => {
    expect(build().version).toBe("2.1.0");
  });
});
