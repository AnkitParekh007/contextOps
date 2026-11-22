-- Phase 2–9 tenant-scoped domain entities
CREATE UNIQUE INDEX "Workspace_id_organizationId_key" ON "Workspace"("id","organizationId");

CREATE TABLE "WorkflowConnection" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
  "config" JSONB,
  "consentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkflowConnection_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WorkflowConnection_organizationId_workspaceId_idx" ON "WorkflowConnection"("organizationId","workspaceId");
ALTER TABLE "WorkflowConnection" ADD CONSTRAINT "WorkflowConnection_workspaceId_organizationId_fkey" FOREIGN KEY ("workspaceId","organizationId") REFERENCES "Workspace"("id","organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ImportJob" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "filename" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "total" INTEGER NOT NULL DEFAULT 0,
  "processed" INTEGER NOT NULL DEFAULT 0,
  "rejected" INTEGER NOT NULL DEFAULT 0,
  "issues" JSONB,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ImportJob_organizationId_workspaceId_idx" ON "ImportJob"("organizationId","workspaceId");
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_workspaceId_organizationId_fkey" FOREIGN KEY ("workspaceId","organizationId") REFERENCES "Workspace"("id","organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ExecutionTrace" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "externalTraceId" TEXT NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL,
  "taskType" TEXT NOT NULL,
  "inputText" TEXT,
  "promptTemplate" TEXT,
  "modelProvider" TEXT NOT NULL,
  "modelName" TEXT NOT NULL,
  "inputTokens" INTEGER NOT NULL,
  "outputTokens" INTEGER NOT NULL,
  "latencyMs" INTEGER NOT NULL,
  "status" TEXT NOT NULL,
  "errorMessage" TEXT,
  "outputText" TEXT,
  "expectedOutput" TEXT,
  "humanLabel" TEXT,
  "qualityScore" DOUBLE PRECISION,
  "businessContextRefs" JSONB,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExecutionTrace_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ExecutionTrace_organizationId_workspaceId_idx" ON "ExecutionTrace"("organizationId","workspaceId");
ALTER TABLE "ExecutionTrace" ADD CONSTRAINT "ExecutionTrace_workspaceId_organizationId_fkey" FOREIGN KEY ("workspaceId","organizationId") REFERENCES "Workspace"("id","organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "ExecutionTrace_workspaceId_externalTraceId_key" ON "ExecutionTrace"("workspaceId","externalTraceId");

CREATE TABLE "TraceEvent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "traceId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "details" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TraceEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TraceEvent_organizationId_workspaceId_idx" ON "TraceEvent"("organizationId","workspaceId");
ALTER TABLE "TraceEvent" ADD CONSTRAINT "TraceEvent_workspaceId_organizationId_fkey" FOREIGN KEY ("workspaceId","organizationId") REFERENCES "Workspace"("id","organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "TraceEvent_traceId_idx" ON "TraceEvent"("traceId");

CREATE TABLE "TaskClassification" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "traceId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL,
  "risk" TEXT NOT NULL,
  "suitability" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "evaluationApproach" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskClassification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TaskClassification_organizationId_workspaceId_idx" ON "TaskClassification"("organizationId","workspaceId");
ALTER TABLE "TaskClassification" ADD CONSTRAINT "TaskClassification_workspaceId_organizationId_fkey" FOREIGN KEY ("workspaceId","organizationId") REFERENCES "Workspace"("id","organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "TaskClassification_traceId_key" ON "TaskClassification"("traceId");
CREATE INDEX "TaskClassification_workspaceId_suitability_idx" ON "TaskClassification"("workspaceId","suitability");

CREATE TABLE "RoutingPolicy" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "config" JSONB NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "evaluationRunId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RoutingPolicy_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RoutingPolicy_organizationId_workspaceId_idx" ON "RoutingPolicy"("organizationId","workspaceId");
ALTER TABLE "RoutingPolicy" ADD CONSTRAINT "RoutingPolicy_workspaceId_organizationId_fkey" FOREIGN KEY ("workspaceId","organizationId") REFERENCES "Workspace"("id","organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ModelRoute" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "routingPolicyId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "priority" INTEGER NOT NULL,
  "settings" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ModelRoute_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ModelRoute_organizationId_workspaceId_idx" ON "ModelRoute"("organizationId","workspaceId");
ALTER TABLE "ModelRoute" ADD CONSTRAINT "ModelRoute_workspaceId_organizationId_fkey" FOREIGN KEY ("workspaceId","organizationId") REFERENCES "Workspace"("id","organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "EvaluationDataset" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "taskType" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "provenance" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EvaluationDataset_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EvaluationDataset_organizationId_workspaceId_idx" ON "EvaluationDataset"("organizationId","workspaceId");
ALTER TABLE "EvaluationDataset" ADD CONSTRAINT "EvaluationDataset_workspaceId_organizationId_fkey" FOREIGN KEY ("workspaceId","organizationId") REFERENCES "Workspace"("id","organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "EvaluationRun" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'RUNNING',
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "baselineModel" TEXT NOT NULL,
  "sampleSize" INTEGER NOT NULL DEFAULT 0,
  "qualityScore" DOUBLE PRECISION,
  "errorRate" DOUBLE PRECISION,
  "averageLatencyMs" DOUBLE PRECISION,
  "estimatedCost" DOUBLE PRECISION,
  "details" JSONB,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EvaluationRun_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EvaluationRun_organizationId_workspaceId_idx" ON "EvaluationRun"("organizationId","workspaceId");
ALTER TABLE "EvaluationRun" ADD CONSTRAINT "EvaluationRun_workspaceId_organizationId_fkey" FOREIGN KEY ("workspaceId","organizationId") REFERENCES "Workspace"("id","organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "EvaluationResult" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "traceId" TEXT NOT NULL,
  "expectedOutput" TEXT,
  "actualOutput" TEXT,
  "qualityScore" DOUBLE PRECISION,
  "valid" BOOLEAN NOT NULL,
  "latencyMs" INTEGER NOT NULL,
  "inputTokens" INTEGER NOT NULL,
  "outputTokens" INTEGER NOT NULL,
  "cost" DOUBLE PRECISION NOT NULL,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EvaluationResult_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EvaluationResult_organizationId_workspaceId_idx" ON "EvaluationResult"("organizationId","workspaceId");
ALTER TABLE "EvaluationResult" ADD CONSTRAINT "EvaluationResult_workspaceId_organizationId_fkey" FOREIGN KEY ("workspaceId","organizationId") REFERENCES "Workspace"("id","organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "QualityThreshold" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "taskType" TEXT NOT NULL,
  "minimumQuality" DOUBLE PRECISION NOT NULL DEFAULT 0.95,
  "maximumErrorRate" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
  "maximumFallbackRate" DOUBLE PRECISION NOT NULL DEFAULT 0.20,
  "maximumLatencyMs" INTEGER NOT NULL DEFAULT 10000,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QualityThreshold_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "QualityThreshold_organizationId_workspaceId_idx" ON "QualityThreshold"("organizationId","workspaceId");
ALTER TABLE "QualityThreshold" ADD CONSTRAINT "QualityThreshold_workspaceId_organizationId_fkey" FOREIGN KEY ("workspaceId","organizationId") REFERENCES "Workspace"("id","organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "QualityThreshold_workspaceId_taskType_key" ON "QualityThreshold"("workspaceId","taskType");

CREATE TABLE "CostSnapshot" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "priceInputPerMillion" DOUBLE PRECISION NOT NULL,
  "priceOutputPerMillion" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CostSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CostSnapshot_organizationId_workspaceId_idx" ON "CostSnapshot"("organizationId","workspaceId");
ALTER TABLE "CostSnapshot" ADD CONSTRAINT "CostSnapshot_workspaceId_organizationId_fkey" FOREIGN KEY ("workspaceId","organizationId") REFERENCES "Workspace"("id","organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SavingsReport" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "baselineCost" DOUBLE PRECISION NOT NULL,
  "optimizedCost" DOUBLE PRECISION NOT NULL,
  "monthlyVolume" INTEGER NOT NULL,
  "estimatedMonthlySavings" DOUBLE PRECISION NOT NULL,
  "projectedAnnualSavings" DOUBLE PRECISION NOT NULL,
  "simulatedMonthlySavings" DOUBLE PRECISION,
  "verifiedMonthlySavings" DOUBLE PRECISION,
  "qualityScore" DOUBLE PRECISION,
  "assumptions" JSONB NOT NULL,
  "markdown" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SavingsReport_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SavingsReport_organizationId_workspaceId_idx" ON "SavingsReport"("organizationId","workspaceId");
ALTER TABLE "SavingsReport" ADD CONSTRAINT "SavingsReport_workspaceId_organizationId_fkey" FOREIGN KEY ("workspaceId","organizationId") REFERENCES "Workspace"("id","organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ShadowModeRun" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "policyId" TEXT NOT NULL,
  "evaluationRunId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'SIMULATED',
  "total" INTEGER NOT NULL,
  "routed" INTEGER NOT NULL,
  "escalated" INTEGER NOT NULL,
  "blocked" INTEGER NOT NULL,
  "baselineCost" DOUBLE PRECISION NOT NULL,
  "projectedCost" DOUBLE PRECISION NOT NULL,
  "simulatedSavings" DOUBLE PRECISION NOT NULL,
  "projectedQuality" DOUBLE PRECISION,
  "decisions" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShadowModeRun_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ShadowModeRun_organizationId_workspaceId_idx" ON "ShadowModeRun"("organizationId","workspaceId");
ALTER TABLE "ShadowModeRun" ADD CONSTRAINT "ShadowModeRun_workspaceId_organizationId_fkey" FOREIGN KEY ("workspaceId","organizationId") REFERENCES "Workspace"("id","organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "FeedbackEvent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "traceId" TEXT,
  "eventType" TEXT NOT NULL,
  "label" TEXT,
  "details" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FeedbackEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FeedbackEvent_organizationId_workspaceId_idx" ON "FeedbackEvent"("organizationId","workspaceId");
ALTER TABLE "FeedbackEvent" ADD CONSTRAINT "FeedbackEvent_workspaceId_organizationId_fkey" FOREIGN KEY ("workspaceId","organizationId") REFERENCES "Workspace"("id","organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "HumanReview" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "traceId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "reason" TEXT NOT NULL,
  "decision" TEXT,
  "reviewerId" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HumanReview_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "HumanReview_organizationId_workspaceId_idx" ON "HumanReview"("organizationId","workspaceId");
ALTER TABLE "HumanReview" ADD CONSTRAINT "HumanReview_workspaceId_organizationId_fkey" FOREIGN KEY ("workspaceId","organizationId") REFERENCES "Workspace"("id","organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
