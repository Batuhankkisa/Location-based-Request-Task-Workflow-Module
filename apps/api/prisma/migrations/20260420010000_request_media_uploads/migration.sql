CREATE TYPE "RequestMediaType" AS ENUM ('IMAGE', 'AUDIO');

ALTER TABLE "VisitorRequest"
  ADD COLUMN "transcriptText" TEXT,
  ADD COLUMN "audioFileUrl" TEXT;

CREATE TABLE "RequestMedia" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "type" "RequestMediaType" NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "originalName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RequestMedia_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RequestMedia_requestId_idx" ON "RequestMedia"("requestId");
CREATE INDEX "RequestMedia_type_idx" ON "RequestMedia"("type");

ALTER TABLE "RequestMedia"
  ADD CONSTRAINT "RequestMedia_requestId_fkey"
  FOREIGN KEY ("requestId") REFERENCES "VisitorRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
