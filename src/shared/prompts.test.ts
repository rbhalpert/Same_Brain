import { describe, expect, it } from "vitest";

import { PROMPTS } from "./prompts.js";

describe("PROMPTS", () => {
  it("contains a curated bank of exactly 100 prompts", () => {
    expect(PROMPTS).toHaveLength(100);
  });

  it("does not contain duplicate prompts", () => {
    expect(new Set(PROMPTS).size).toBe(PROMPTS.length);
  });
});
