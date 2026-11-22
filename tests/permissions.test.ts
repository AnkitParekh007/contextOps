import { describe, expect, it } from "vitest";
import { canReadWorkspace, canWriteWorkspace } from "../src/lib/permissions";
describe("membership permissions", () => {
  it("only allows owner and admin to create workspaces", () => {
    expect(canWriteWorkspace("OWNER")).toBe(true);
    expect(canWriteWorkspace("ADMIN")).toBe(true);
    expect(canWriteWorkspace("ANALYST")).toBe(false);
    expect(canWriteWorkspace("VIEWER")).toBe(false);
  });
  it("allows scoped members to read workspaces", () => {
    expect(canReadWorkspace("VIEWER")).toBe(true);
  });
});
