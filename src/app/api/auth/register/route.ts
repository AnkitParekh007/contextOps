import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import {createHash,timingSafeEqual} from "node:crypto";
import { db } from "@/lib/db";
import { apiError, handleApiError } from "@/lib/http";
import { originAllowed, enforceRateLimit } from "@/lib/security";
import { registerSchema } from "@/lib/validation";
import { setSession } from "@/lib/session";
import {emailRequired,mailConfigured,sendChallenge} from "@/lib/auth/email";

export async function POST(request: NextRequest) {
  if (!originAllowed(request)) return apiError("Invalid request origin", 403);
  try {
    const body = registerSchema.parse(await request.json());
    if (!await enforceRateLimit("registration", body.email, 5)) return apiError("Try again later", 429);
    if (process.env.NODE_ENV === "production") {
      const configured = process.env.PILOT_INVITE_CODE;
      if (!configured || configured.length < 20 || configured.startsWith("REPLACE_")) return apiError("Pilot registrations are currently closed", 403);
      const requested = body.inviteCode ?? "";
      const actual = createHash("sha256").update(requested).digest();
      const expected = createHash("sha256").update(configured).digest();
      if (!timingSafeEqual(actual, expected)) return apiError("A valid pilot invitation is required", 403);
    }
    if (await db.user.findUnique({ where: { email: body.email }, select: { id: true } })) {
      return apiError("Account already exists", 409);
    }
    if(emailRequired()&&!mailConfigured(body.email))
      return apiError("Email verification is not configured for hosted registration",503);
    const passwordHash = await hash(body.password, 12);
    const user = await db.user.create({ data: { name: body.name, email: body.email, passwordHash } });
    if(emailRequired()){
      await sendChallenge(user,"VERIFY");
      return NextResponse.json({verificationRequired:true,message:"Check your email to verify your account."},
        {status:201,headers:{"Cache-Control":"no-store"}});
    }
    await db.user.update({where:{id:user.id},data:{emailVerifiedAt:new Date()}});
    await setSession(user.id);
    return NextResponse.json({user:{id:user.id,name:user.name,email:user.email}}, {status:201});
  } catch (error) { return handleApiError(error); }
}
