import { describe, it, expect } from "vitest";
import { isCacheHit, PIPELINE_VERSION } from "../../src/utils/buildPipeline.js";

const SHA = "abc123def456";

describe("isCacheHit", () => {
  it("hits when sha + pipelineVersion both match", () => {
    expect(
      isCacheHit({
        meta: { commitSha: SHA, pipelineVersion: PIPELINE_VERSION },
        upstreamSha: SHA,
        pipelineVersion: PIPELINE_VERSION,
      })
    ).toBe(true);
  });

  it("misses on SHA drift (upstream moved)", () => {
    expect(
      isCacheHit({
        meta: { commitSha: SHA, pipelineVersion: PIPELINE_VERSION },
        upstreamSha: "zzz999",
        pipelineVersion: PIPELINE_VERSION,
      })
    ).toBe(false);
  });

  it("misses on pipelineVersion drift (generator format change)", () => {
    expect(
      isCacheHit({
        meta: { commitSha: SHA, pipelineVersion: "v1-0" },
        upstreamSha: SHA,
        pipelineVersion: PIPELINE_VERSION,
      })
    ).toBe(false);
  });

  it("misses when meta is null (no prior workdir)", () => {
    expect(
      isCacheHit({
        meta: null,
        upstreamSha: SHA,
        pipelineVersion: PIPELINE_VERSION,
      })
    ).toBe(false);
  });

  it("misses when upstream SHA is unknown (offline/API failure)", () => {
    expect(
      isCacheHit({
        meta: { commitSha: SHA, pipelineVersion: PIPELINE_VERSION },
        upstreamSha: null,
        pipelineVersion: PIPELINE_VERSION,
      })
    ).toBe(false);
  });
});
