-- Phase 12: immutable benchmarking protocols and aggregate invoice reconciliations.
CREATE TABLE "BenchmarkProtocol" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "status" VARCHAR(16) NOT NULL DEFAULT 'DRAFT',
  "config" JSONB NOT NULL,
  "populationFingerprint" VARCHAR(64),
  "populationSize" INTEGER,
  "holdoutSize" INTEGER,
  "frozenAt" TIMESTAMP(3),
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BenchmarkProtocol_pkey" PRIMARY KEY("id")
);
CREATE INDEX "BenchmarkProtocol_organizationId_workspaceId_createdAt_idx"
  ON "BenchmarkProtocol"("organizationId","workspaceId","createdAt");
ALTER TABLE "BenchmarkProtocol" ADD CONSTRAINT "BenchmarkProtocol_workspaceId_organizationId_fkey"
  FOREIGN KEY ("workspaceId","organizationId") REFERENCES "Workspace"("id","organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EvaluationRun" ADD COLUMN "benchmarkProtocolId" TEXT;
CREATE UNIQUE INDEX "EvaluationRun_benchmarkProtocolId_provider_model_key"
  ON "EvaluationRun"("benchmarkProtocolId","provider","model");
ALTER TABLE "EvaluationRun" ADD CONSTRAINT "EvaluationRun_benchmarkProtocolId_fkey"
  FOREIGN KEY ("benchmarkProtocolId") REFERENCES "BenchmarkProtocol"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE TABLE "BenchmarkReconciliation" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "evaluationRunId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "invoiceReferenceHash" VARCHAR(64) NOT NULL,
  "billedTotalUsd" DOUBLE PRECISION NOT NULL,
  "billableTasks" INTEGER NOT NULL,
  "successfulTasks" INTEGER NOT NULL,
  "overheadUsd" DOUBLE PRECISION NOT NULL,
  "evidenceLevel" VARCHAR(40) NOT NULL DEFAULT 'SELF_REPORTED_UNVERIFIED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BenchmarkReconciliation_pkey" PRIMARY KEY("id")
);
CREATE INDEX "BenchmarkReconciliation_organizationId_workspaceId_createdAt_idx"
  ON "BenchmarkReconciliation"("organizationId","workspaceId","createdAt");
CREATE INDEX "BenchmarkReconciliation_evaluationRunId_idx"
  ON "BenchmarkReconciliation"("evaluationRunId");
ALTER TABLE "BenchmarkReconciliation" ADD CONSTRAINT "BenchmarkReconciliation_workspaceId_organizationId_fkey"
  FOREIGN KEY ("workspaceId","organizationId") REFERENCES "Workspace"("id","organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
