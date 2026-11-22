import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { registerSchema } from "../src/lib/validation";

const db = new PrismaClient();
async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Demo seed is disabled in production");
  const email = process.env.DEMO_EMAIL;
  const password = process.env.DEMO_PASSWORD;
  if (!email || !password) {
    console.log("No demo credentials supplied. Set DEMO_EMAIL and DEMO_PASSWORD to seed Northwind.");
    return;
  }
  const account = registerSchema.parse({ name: "Demo Operator", email, password });
  const user = await db.user.upsert({
    where: { email: account.email },
    update: { passwordHash: await hash(account.password, 12) },
    create: { name: account.name, email: account.email, passwordHash: await hash(account.password, 12) },
  });
  const org = await db.organization.upsert({
    where: { slug: "northwind-demo" },
    update: {},
    create: { name: "Northwind Logistics", slug: "northwind-demo" },
  });
  await db.membership.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
    update: { role: "OWNER" }, create: { userId: user.id, organizationId: org.id, role: "OWNER" },
  });
  await db.workspace.upsert({
    where: { organizationId_slug: { organizationId: org.id, slug: "support-ticket-triage" } },
    update: {},
    create: { organizationId: org.id, slug: "support-ticket-triage", name: "Support Ticket Triage",
      useCase: "SUPPORT_CLASSIFICATION", provider: "ANTHROPIC", modelName: "Claude Sonnet" },
  });
  console.log("Synthetic Northwind workspace created. Trace data will arrive in Phase 2.");
}
main().catch(error => { console.error(error); process.exitCode = 1; })
  .finally(async () => { await db.$disconnect(); });
