import "server-only";
import { createHash } from "node:crypto";
import Redis from "ioredis";
import type { NextRequest } from "next/server";

let redis: Redis | undefined;
function getRedis(): Redis {
  redis ??= new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    lazyConnect: true, maxRetriesPerRequest: 1,
  });
  return redis;
}
/** Fails closed when Redis is unavailable; this is intentional for auth endpoints. */
export async function enforceRateLimit(category: string, identifier: string, limit: number) {
  const digest = createHash("sha256").update(identifier).digest("hex");
  const key = "contextops:ratelimit:" + category + ":" + digest;
  const client = getRedis();
  if (client.status === "wait") await client.connect();
  const count = await client.incr(key);
  if (count === 1) await client.expire(key, 15 * 60);
  return count <= limit;
}
export function originAllowed(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  // Browsers supply Origin on POST. A non-browser API client may omit it.
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(process.env.APP_URL ?? "http://localhost:3000").origin;
  } catch { return false; }
}
