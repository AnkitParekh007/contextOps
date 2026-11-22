import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { db } from "@/lib/db";

const COOKIE_NAME = "contextops_session";
const DURATION_SECONDS = 60 * 60 * 24 * 7;
function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32 || value.startsWith("REPLACE_")) {
    throw new Error("Set a cryptographically random AUTH_SECRET (32+ characters)");
  }
  return new TextEncoder().encode(value);
}
export async function setSession(userId: string): Promise<void> {
  const jwt = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject(userId)
    .setIssuedAt().setExpirationTime("7d").sign(secret());
  (await cookies()).set(COOKIE_NAME, jwt, {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax", path: "/", maxAge: DURATION_SECONDS,
  });
}
export async function clearSession(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}
export async function getCurrentUser() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (!payload.sub) return null;
    return await db.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true },
    });
  } catch {
    return null;
  }
}
