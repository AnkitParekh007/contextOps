import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  inviteCode: z.string().trim().max(256).optional(),
  email: z.string().trim().email().max(320).transform(v => v.toLowerCase()),
  password: z.string().min(12).max(128).regex(/[A-Z]/, "Use at least one uppercase letter")
    .regex(/[a-z]/, "Use at least one lowercase letter")
    .regex(/[0-9]/, "Use at least one number"),
});
export const loginSchema = z.object({
  mfaCode:z.string().trim().max(40).optional(),
  email: z.string().trim().email().transform(v => v.toLowerCase()),
  password: z.string().min(1),
});
export const useCases = [
  "SUPPORT_CLASSIFICATION", "DOCUMENT_EXTRACTION", "POLICY_QA",
  "SALES_FOLLOW_UP", "LEAD_QUALIFICATION", "OTHER",
] as const;
export const providerNames = ["ANTHROPIC", "OPENAI", "GOOGLE", "OTHER"] as const;
export const workspaceSchema = z.object({
  name: z.string().trim().min(2).max(120),
  useCase: z.enum(useCases),
  provider: z.enum(providerNames),
  modelName: z.string().trim().min(2).max(120),
});
export const organizationSchema = z.object({
  companyName: z.string().trim().min(2).max(120),
  workspace: workspaceSchema,
});
