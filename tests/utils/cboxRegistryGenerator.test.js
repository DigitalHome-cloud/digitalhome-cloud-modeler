import { describe, it, expect } from "vitest";
import { parseGraphs } from "../../src/utils/ttlParser.js";
import { buildCboxRegistry } from "../../src/utils/cboxRegistryGenerator.js";
import { MINI_TBOX_TTL, MINI_CBOX_TTL, MINI_PROFILE } from "../_helpers/fixtures.js";

function build() {
  const { cbox } = parseGraphs({
    tboxTtls: [{ name: "core", ttl: MINI_TBOX_TTL }],
    cboxTtls: [{ profile: MINI_PROFILE, ttl: MINI_CBOX_TTL }],
  });
  return buildCboxRegistry({ cbox, registryVersion: "2.1.0" });
}

describe("buildCboxRegistry", () => {
  it("carries version + generatedAt + profiles[]", () => {
    const reg = build();
    expect(reg.version).toBe("2.1.0");
    expect(typeof reg.generatedAt).toBe("string");
    expect(reg.profiles.length).toBe(1);
  });

  it("records targetClasses derived from shape targets", () => {
    const reg = build();
    expect(reg.profiles[0].targetClasses).toEqual(["dhc:Circuit"]);
  });

  it("flattens each shape with condition + constraints + defaults + messages", () => {
    const reg = build();
    const shape = reg.profiles[0].shapes[0];
    expect(shape.targetClass).toBe("dhc:Circuit");
    expect(shape.condition).toMatchObject({
      path: "hasCircuitType",
      equals: "dhc:CircuitType_Lighting",
    });
    expect(shape.constraints[0]).toMatchObject({
      path: "ratedCurrent",
      maxInclusive: 16,
    });
    expect(shape.defaults).toEqual({ ratedCurrent: 10 });
    expect(shape.messages.ratedCurrent.en).toMatch(/Lighting/);
  });
});
