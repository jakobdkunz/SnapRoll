CREATE TABLE "SlideshowAsset" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "teacherId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "filePath" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "totalSlides" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "SlideshowAsset_teacherId_idx" ON "SlideshowAsset" ("teacherId");

ALTER TABLE "SlideshowAsset"
  ADD CONSTRAINT "SlideshowAsset_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


