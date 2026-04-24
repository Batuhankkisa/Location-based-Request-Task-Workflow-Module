CREATE TYPE "OrganizationType" AS ENUM ('HOSPITAL', 'CLINIC', 'HOTEL', 'RESTAURANT', 'GENERAL');

CREATE TABLE "Organization" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "type" "OrganizationType" NOT NULL DEFAULT 'GENERAL',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Organization_code_key" ON "Organization"("code");
CREATE INDEX "Organization_type_idx" ON "Organization"("type");
CREATE INDEX "Organization_isActive_idx" ON "Organization"("isActive");

ALTER TABLE "Location" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "User" ADD COLUMN "organizationId" TEXT;

WITH root_locations AS (
  SELECT
    "id",
    "name",
    "code",
    "createdAt",
    CASE
      WHEN "code" ILIKE 'HOSPITAL_%' OR "name" ILIKE '%hastane%' OR "name" ILIKE '%hospital%' THEN 'HOSPITAL'::"OrganizationType"
      WHEN "name" ILIKE '%otel%' OR "name" ILIKE '%hotel%' THEN 'HOTEL'::"OrganizationType"
      WHEN "name" ILIKE '%restoran%' OR "name" ILIKE '%restaurant%' THEN 'RESTAURANT'::"OrganizationType"
      WHEN "name" ILIKE '%klinik%' OR "name" ILIKE '%clinic%' OR "name" ILIKE '%fizik tedavi%' THEN 'CLINIC'::"OrganizationType"
      ELSE 'GENERAL'::"OrganizationType"
    END AS "organizationType"
  FROM "Location"
  WHERE "parentId" IS NULL
    AND "type" = 'ORGANIZATION'
)
INSERT INTO "Organization" ("id", "name", "code", "type", "isActive", "createdAt", "updatedAt")
SELECT
  'org_' || md5("id"),
  "name",
  "code",
  "organizationType",
  true,
  "createdAt",
  CURRENT_TIMESTAMP
FROM root_locations;

INSERT INTO "Organization" ("id", "name", "code", "type", "isActive", "createdAt", "updatedAt")
SELECT
  'org_legacy_default',
  'Legacy Organization',
  'LEGACY_ORG',
  'GENERAL'::"OrganizationType",
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE EXISTS (
  SELECT 1
  FROM "Location"
)
AND NOT EXISTS (
  SELECT 1
  FROM "Organization"
);

WITH RECURSIVE location_scope AS (
  SELECT
    "id" AS "locationId",
    'org_' || md5("id") AS "organizationId"
  FROM "Location"
  WHERE "parentId" IS NULL
    AND "type" = 'ORGANIZATION'

  UNION ALL

  SELECT
    child."id" AS "locationId",
    parent_scope."organizationId"
  FROM "Location" child
  INNER JOIN location_scope parent_scope
    ON child."parentId" = parent_scope."locationId"
)
UPDATE "Location" location
SET "organizationId" = location_scope."organizationId"
FROM location_scope
WHERE location."id" = location_scope."locationId";

UPDATE "Location"
SET "organizationId" = 'org_legacy_default'
WHERE "organizationId" IS NULL;

WITH primary_organization AS (
  SELECT "id"
  FROM "Organization"
  ORDER BY "createdAt" ASC, "code" ASC
  LIMIT 1
)
UPDATE "User"
SET "organizationId" = (SELECT "id" FROM primary_organization)
WHERE "role" <> 'ADMIN'
  AND "organizationId" IS NULL
  AND EXISTS (SELECT 1 FROM primary_organization);

ALTER TABLE "Location" ALTER COLUMN "organizationId" SET NOT NULL;

DROP INDEX "Location_code_key";
CREATE UNIQUE INDEX "Location_organizationId_code_key" ON "Location"("organizationId", "code");
CREATE INDEX "Location_organizationId_idx" ON "Location"("organizationId");
CREATE INDEX "Location_organizationId_parentId_idx" ON "Location"("organizationId", "parentId");
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

ALTER TABLE "Location"
  ADD CONSTRAINT "Location_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "User"
  ADD CONSTRAINT "User_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
