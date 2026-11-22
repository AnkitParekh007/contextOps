import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { apiError, handleApiError } from "@/lib/http";
import { originAllowed, enforceRateLimit } from "@/lib/security";
import { loginSchema } from "@/lib/validation";
import { setSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  if (!originAllowed(request)) return apiError("Invalid request origin", 403);
  try {
    const body = loginSchema.parse(await request.json());
    if (!await enforceRateLimit("login", body.email, 10)) return apiError("Try again later", 429);
    const user = await db.user.findUnique({ where: { email: body.email } });
    if (!user || !await compare(body.password, user.passwordHash)) return apiError("Invalid email or password", 401);
    await setSession(user.id);
    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) { return handleApiError(error); }
}
