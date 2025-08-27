/*
  Migration to refactor slideshow system from session-based to asset-based
  This migration:
  1. Creates SlideshowAsset records from existing SlideshowSession data
  2. Links existing SlideshowSlide records to the new assets
  3. Updates the schema to use the new asset-based relationships
*/

-- Step 0: Add assetId columns first
ALTER TABLE "SlideshowSession" ADD COLUMN "assetId" TEXT;
ALTER TABLE "SlideshowSlide" ADD COLUMN "assetId" TEXT;

-- Step 1: Create SlideshowAsset records from existing sessions
INSERT INTO "SlideshowAsset" ("id", "teacherId", "title", "filePath", "mimeType", "totalSlides", "createdAt")
SELECT 
  'asset_' || ss."id" as "id",
  s."teacherId",
  ss."title",
  ss."filePath", 
  ss."mimeType",
  ss."totalSlides",
  ss."createdAt"
FROM "SlideshowSession" ss
JOIN "Section" s ON ss."sectionId" = s."id"
WHERE ss."title" IS NOT NULL;

-- Step 2: Update SlideshowSlide records to link to assets
UPDATE "SlideshowSlide" 
SET "assetId" = 'asset_' || "sessionId"
WHERE "sessionId" IS NOT NULL;

-- Step 3: Update SlideshowSession to reference assets
UPDATE "SlideshowSession" 
SET "assetId" = 'asset_' || "id"
WHERE "id" IS NOT NULL;

-- Step 4: Now we can safely update the schema
-- Make assetId required in SlideshowSession
ALTER TABLE "SlideshowSession" ALTER COLUMN "assetId" SET NOT NULL;

-- Drop the old columns from SlideshowSession
ALTER TABLE "SlideshowSession" DROP COLUMN "filePath",
DROP COLUMN "mimeType",
DROP COLUMN "title",
DROP COLUMN "totalSlides";

-- Create indexes
CREATE INDEX "SlideshowSession_assetId_idx" ON "SlideshowSession"("assetId");
CREATE INDEX "SlideshowSlide_assetId_idx" ON "SlideshowSlide"("assetId");

-- Create unique constraints
CREATE UNIQUE INDEX "SlideshowSlide_assetId_index_key" ON "SlideshowSlide"("assetId", "index");

-- Add foreign key constraints
ALTER TABLE "SlideshowSession" ADD CONSTRAINT "SlideshowSession_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "SlideshowAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SlideshowSlide" ADD CONSTRAINT "SlideshowSlide_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "SlideshowAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
