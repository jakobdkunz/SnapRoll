CREATE TABLE "SlideshowSession" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "sectionId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "filePath" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "totalSlides" INTEGER,
  "currentSlide" INTEGER NOT NULL DEFAULT 1,
  "showOnDevices" BOOLEAN NOT NULL DEFAULT true,
  "allowDownload" BOOLEAN NOT NULL DEFAULT true,
  "requireStay" BOOLEAN NOT NULL DEFAULT false,
  "preventJump" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  "instructorLastSeenAt" TIMESTAMP(3)
);

CREATE INDEX "SlideshowSession_sectionId_idx" ON "SlideshowSession" ("sectionId");

ALTER TABLE "SlideshowSession"
  ADD CONSTRAINT "SlideshowSession_sectionId_fkey"
  FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;


