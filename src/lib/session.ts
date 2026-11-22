import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { db } from "@/lib/db";
import {emailRequired} from "@/lib/auth/email";

const COOKIE_NAME = "contextops_session";
const DURATION_SECONDS = 60 * 60 * 24 * 7;

/** Strict verification means all pre-Phase-11 JWTs without a jti require re-login. */
function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32 || value.startsWith("REPLACE_")) {
    throw new Error("Set a cryptographically random AUTH_SECRET (32+ characters)");
  }
  return new TextEncoder().encode(value);
}
function claimIdentifiers(payload: { sub?: string; jti?: string }) {
  return typeof payload.sub === "string" && typeof payload.jti === "string" && payload.jti.length > 0
    ? { userId: payload.sub, id: payload.jti } : null;
}
async function readSessionIds() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    return claimIdentifiers(payload);
  } catch { return null; }
}
export async function setSession(userId: string): Promise<void> {
  const expiresAt = new Date(Date.now() + DURATION_SECONDS * 1000);
  const session = await db.authSession.create({ data: { userId, expiresAt } });
  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setJti(session.id)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(secret());
  (await cookies()).set(COOKIE_NAME, jwt, {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax", path: "/", maxAge: DURATION_SECONDS,
  });
}

/** Logout revokes the DB session; deleting the cookie is not enough. */
export async function clearSession(): Promise<void> {
  const ids = await readSessionIds();
  if (ids) {
    await db.authSession.updateMany({
      where: { id: ids.id, userId: ids.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  (await cookies()).delete(COOKIE_NAME);
}
export async function revokeAllSessions(userId: string): Promise<number> {
  const updated = await db.authSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  (await cookies()).delete(COOKIE_NAME);
  return updated.count;
}
export async function getCurrentUser() {
  const ids = await readSessionIds();
  if (!ids) return null;
  const active = await db.authSession.findFirst({
    where: {
      id: ids.id, userId: ids.userId, revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: {
      user: { select: { id: true, name: true, email: true } },
    },
  });
  if(!active?.user)return null;
  if(emailRequired()){
    const verified=await db.user.findUnique({where:{id:ids.userId},select:{emailVerifiedAt:true}});
    if(!verified?.emailVerifiedAt)return null;
  }
  return active.user;
}
