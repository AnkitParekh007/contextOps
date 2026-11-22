import { NextRequest, NextResponse } from "next/server";
import { originAllowed } from "@/lib/security";
import { clearSession } from "@/lib/session";
import { apiError } from "@/lib/http";
export async function POST(request: NextRequest) {
  if (!originAllowed(request)) return apiError("Invalid request origin", 403);
  await clearSession();
  return NextResponse.json({ ok: true });
}
