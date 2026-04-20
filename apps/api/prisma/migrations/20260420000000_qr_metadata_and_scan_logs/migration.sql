CREATE TYPE "QrScanStatus" AS ENUM ('RESOLVED', 'INACTIVE', 'TOKEN_NOT_FOUND', 'REQUEST_CREATED', 'REQUEST_FAILED');

ALTER TABLE "QrCode"
  ADD COLUMN "deactivatedAt" TIMESTAMP(3),
  ADD COLUMN "lastScannedAt" TIMESTAMP(3),
  ADD COLUMN "scanCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "imagePath" TEXT,
  ADD COLUMN "note" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "QrScanLog" (
  "id" TEXT NOT NULL,
  "qrCodeId" TEXT,
  "tokenSnapshot" TEXT NOT NULL,
  "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ip" TEXT,
  "userAgent" TEXT,
  "resolvedLocationId" TEXT,
  "status" "QrScanStatus" NOT NULL,
  "requestId" TEXT,
  "createdTaskId" TEXT,
  "errorMessage" TEXT,
  CONSTRAINT "QrScanLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "QrCode_isActive_idx" ON "QrCode"("isActive");

CREATE INDEX "QrScanLog_qrCodeId_idx" ON "QrScanLog"("qrCodeId");
CREATE INDEX "QrScanLog_scannedAt_idx" ON "QrScanLog"("scannedAt");
CREATE INDEX "QrScanLog_status_idx" ON "QrScanLog"("status");
CREATE INDEX "QrScanLog_requestId_idx" ON "QrScanLog"("requestId");
CREATE INDEX "QrScanLog_resolvedLocationId_idx" ON "QrScanLog"("resolvedLocationId");

ALTER TABLE "QrScanLog"
  ADD CONSTRAINT "QrScanLog_qrCodeId_fkey"
  FOREIGN KEY ("qrCodeId") REFERENCES "QrCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "QrScanLog"
  ADD CONSTRAINT "QrScanLog_resolvedLocationId_fkey"
  FOREIGN KEY ("resolvedLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "QrScanLog"
  ADD CONSTRAINT "QrScanLog_requestId_fkey"
  FOREIGN KEY ("requestId") REFERENCES "VisitorRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "QrScanLog"
  ADD CONSTRAINT "QrScanLog_createdTaskId_fkey"
  FOREIGN KEY ("createdTaskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
