import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { createSlug } from "@/lib/slug";
import { apiError, handleApiError } from "@/lib/http";
import { canWriteWorkspace } from "@/lib/permissions";
import { originAllowed } from "@/lib/security";
import { workspaceSchema } from "@/lib/validation";

type Context = { params: Promise<{ organizationId: string }> };
async function membershipFor(userId: string, orgId: string) {
  return db.membership.findUnique({ where: { userId_organizationId: { userId, organizationId: orgId } } });
}
export async function GET(_request: NextRequest, { params }: Context) {
  const user = await getCurrentUser();
  if (!user) return apiError("Unauthorized", 401);
  const { organizationId } = await params;
  if (!await membershipFor(user.id, organizationId)) return apiError("Not found", 404);
  const workspaces = await db.workspace.findMany({
    where: { organizationId }, orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ workspaces });
}
export async function POST(request: NextRequest, { params }: Context) {
  if (!originAllowed(request)) return apiError("Invalid request origin", 403);
  const user = await getCurrentUser();
  if (!user) return apiError("Unauthorized", 401);
  const { organizationId } = await params;
  const membership = await membershipFor(user.id, organizationId);
  if (!membership) return apiError("Not found", 404);
  if (!canWriteWorkspace(membership.role)) return apiError("Insufficient permissions", 403);
  try {
    const body = workspaceSchema.parse(await request.json());
    const workspace = await db.$transaction(async tx => {
      const created = await tx.workspace.create({ data: {
        organizationId, name: body.name, slug: createSlug(body.name),
        useCase: body.useCase, provider: body.provider, modelName: body.modelName,
      } });
      await tx.auditLog.create({ data: {
        organizationId, actorId: user.id, action: "WORKSPACE_CREATED",
        subjectType: "Workspace", subjectId: created.id,
      } });
      return created;
    });
    return NextResponse.json({ workspace }, { status: 201 });
  } catch (error) { return handleApiError(error); }
}
