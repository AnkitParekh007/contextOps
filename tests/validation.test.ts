import { describe, expect, it } from "vitest";
import { registerSchema, organizationSchema } from "../src/lib/validation";

describe("account validation", () => {
  it("normalizes user emails", () => {
    const parsed=registerSchema.parse({name:"Taylor Lee",email:" TEST@Example.com ",password:"StrongPassword123"});
    expect(parsed.email).toBe("test@example.com");
  });
  it("rejects weak passwords", () => {
    expect(registerSchema.safeParse({name:"Taylor Lee",email:"t@example.com",password:"password"}).success).toBe(false);
  });
});
describe("workspace validation", () => {
  it("accepts a supported workflow", () => {
    expect(organizationSchema.safeParse({companyName:"Northwind", workspace:{
      name:"Ticket Triage",useCase:"SUPPORT_CLASSIFICATION",provider:"ANTHROPIC",modelName:"Claude Sonnet"
    }}).success).toBe(true);
  });
  it("rejects unsupported providers and categories", () => {
    expect(organizationSchema.safeParse({companyName:"Northwind", workspace:{
      name:"Ticket Triage",useCase:"UNKNOWN",provider:"INVALID",modelName:"Claude Sonnet"
    }}).success).toBe(false);
  });
});
