import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { createSlug } from "@/lib/slug";
import { apiError, handleApiError } from "@/lib/http";
import { originAllowed } from "@/lib/security";
import { organizationSchema } from "@/lib/validation";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiError("Unauthorized", 401);
  const memberships = await db.membership.findMany({
    where: { userId: user.id },
    include: { organization: { include: { workspaces: { orderBy: { createdAt: "asc" } } } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ organizations: memberships.map(m => ({ ...m.organization, role: m.role })) });
}
export async function POST(request: NextRequest) {
  if (!originAllowed(request)) return apiError("Invalid request origin", 403);
  const user = await getCurrentUser();
  if (!user) return apiError("Unauthorized", 401);
  try {
    const body = organizationSchema.parse(await request.json());
    const organization = await db.$transaction(async tx => {
      const org = await tx.organization.create({ data: {
        name: body.companyName, slug: createSlug(body.companyName),
      } });
      await tx.membership.create({ data: { organizationId: org.id, userId: user.id, role: "OWNER" } });
      const workspace = await tx.workspace.create({ data: {
        organizationId: org.id, name: body.workspace.name, slug: createSlug(body.workspace.name),
        useCase: body.workspace.useCase, provider: body.workspace.provider, modelName: body.workspace.modelName,
      } });
      await tx.auditLog.create({ data: {
        organizationId: org.id, actorId: user.id, action: "WORKSPACE_CREATED",
        subjectType: "Workspace", subjectId: workspace.id, metadata: { source: "onboarding" },
      } });
      return { ...org, workspace };
    });
    return NextResponse.json({ organization }, { status: 201 });
  } catch (error) { return handleApiError(error); }
}
