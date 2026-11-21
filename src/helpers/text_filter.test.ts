import { describe, expect, it } from "vitest";
import { normalizeForFilter } from "./text_filter";

describe("normalizeForFilter", () => {
  it("lowercases and strips diacritics", () => {
    expect(normalizeForFilter("Béla Bartók")).toBe("bela bartok");
    expect(normalizeForFilter("Dvořák")).toBe("dvorak");
  });

  it("leaves plain text as it is", () => {
    expect(normalizeForFilter("mozart")).toBe("mozart");
  });
});
