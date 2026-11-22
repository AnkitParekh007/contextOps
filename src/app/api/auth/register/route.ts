import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { apiError, handleApiError } from "@/lib/http";
import { originAllowed, enforceRateLimit } from "@/lib/security";
import { registerSchema } from "@/lib/validation";
import { setSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  if (!originAllowed(request)) return apiError("Invalid request origin", 403);
  try {
    const body = registerSchema.parse(await request.json());
    if (!await enforceRateLimit("registration", body.email, 5)) return apiError("Try again later", 429);
    if (await db.user.findUnique({ where: { email: body.email }, select: { id: true } })) {
      return apiError("Account already exists", 409);
    }
    const passwordHash = await hash(body.password, 12);
    const user = await db.user.create({ data: { name: body.name, email: body.email, passwordHash } });
    await setSession(user.id);
    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } }, { status: 201 });
  } catch (error) { return handleApiError(error); }
}
