CREATE TYPE "LocationType" AS ENUM ('ORGANIZATION', 'FLOOR', 'ROOM', 'AREA');

CREATE TYPE "RequestChannel" AS ENUM ('QR_WEB');

CREATE TYPE "TaskStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'DONE_WAITING_APPROVAL', 'APPROVED', 'REJECTED');

CREATE TABLE "Location" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "type" "LocationType" NOT NULL,
  "parentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QrCode" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "locationId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QrCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VisitorRequest" (
  "id" TEXT NOT NULL,
  "qrCodeId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "requestText" TEXT NOT NULL,
  "channel" "RequestChannel" NOT NULL DEFAULT 'QR_WEB',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VisitorRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Task" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "status" "TaskStatus" NOT NULL DEFAULT 'NEW',
  "assignedTo" TEXT,
  "completedBy" TEXT,
  "approvedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TaskHistory" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "fromStatus" "TaskStatus",
  "toStatus" "TaskStatus" NOT NULL,
  "note" TEXT,
  "changedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Location_code_key" ON "Location"("code");
CREATE INDEX "Location_parentId_idx" ON "Location"("parentId");

CREATE UNIQUE INDEX "QrCode_token_key" ON "QrCode"("token");
CREATE INDEX "QrCode_locationId_idx" ON "QrCode"("locationId");

CREATE INDEX "VisitorRequest_qrCodeId_idx" ON "VisitorRequest"("qrCodeId");
CREATE INDEX "VisitorRequest_locationId_idx" ON "VisitorRequest"("locationId");

CREATE UNIQUE INDEX "Task_requestId_key" ON "Task"("requestId");
CREATE INDEX "Task_locationId_idx" ON "Task"("locationId");
CREATE INDEX "Task_status_idx" ON "Task"("status");

CREATE INDEX "TaskHistory_taskId_idx" ON "TaskHistory"("taskId");

ALTER TABLE "Location"
  ADD CONSTRAINT "Location_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "QrCode"
  ADD CONSTRAINT "QrCode_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VisitorRequest"
  ADD CONSTRAINT "VisitorRequest_qrCodeId_fkey"
  FOREIGN KEY ("qrCodeId") REFERENCES "QrCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VisitorRequest"
  ADD CONSTRAINT "VisitorRequest_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Task"
  ADD CONSTRAINT "Task_requestId_fkey"
  FOREIGN KEY ("requestId") REFERENCES "VisitorRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Task"
  ADD CONSTRAINT "Task_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TaskHistory"
  ADD CONSTRAINT "TaskHistory_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
