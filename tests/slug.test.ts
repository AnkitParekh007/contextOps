import { describe, expect, it } from "vitest";
import { createSlug } from "../src/lib/slug";
describe("tenant slug generation", () => {
  it("generates URL-safe and distinct slugs", () => {
    const first=createSlug("Northwind Logistics!");
    const second=createSlug("Northwind Logistics!");
    expect(first).toMatch(/^northwind-logistics-[a-f0-9]{8}$/);
    expect(first).not.toBe(second);
  });
  it("supports names made entirely of punctuation", () => {
    expect(createSlug("???")).toMatch(/^workspace-/);
  });
});
