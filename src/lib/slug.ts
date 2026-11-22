import { randomBytes } from "node:crypto";
export function createSlug(name: string): string {
  const base = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "workspace";
  return base + "-" + randomBytes(4).toString("hex");
}
