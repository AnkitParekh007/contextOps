-- Phase 11 completion: verified email, account recovery, MFA and opt-in workspace expiry.
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "mfaSecretEncrypted" TEXT;
ALTER TABLE "User" ADD COLUMN "mfaPendingEncrypted" TEXT;
ALTER TABLE "User" ADD COLUMN "mfaEnabledAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "mfaLastCounter" INTEGER;
ALTER TABLE "Workspace" ADD COLUMN "retentionUntil" TIMESTAMP(3);
CREATE INDEX "Workspace_retentionUntil_idx" ON "Workspace"("retentionUntil");
CREATE TABLE "AuthChallenge" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "purpose" VARCHAR(16) NOT NULL,
  "tokenHash" VARCHAR(64) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  CONSTRAINT "AuthChallenge_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AuthChallenge_tokenHash_key" ON "AuthChallenge"("tokenHash");
CREATE INDEX "AuthChallenge_userId_purpose_createdAt_idx" ON "AuthChallenge"("userId","purpose","createdAt");
CREATE INDEX "AuthChallenge_expiresAt_idx" ON "AuthChallenge"("expiresAt");
ALTER TABLE "AuthChallenge" ADD CONSTRAINT "AuthChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "MfaRecoveryCode" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "codeHash" VARCHAR(64) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MfaRecoveryCode_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MfaRecoveryCode_userId_codeHash_key" ON "MfaRecoveryCode"("userId","codeHash");
ALTER TABLE "MfaRecoveryCode" ADD CONSTRAINT "MfaRecoveryCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
