-- CreateTable
CREATE TABLE "SlideshowSlide" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlideshowSlide_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SlideshowSlide_sessionId_idx" ON "SlideshowSlide"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "SlideshowSlide_sessionId_index_key" ON "SlideshowSlide"("sessionId", "index");

-- AddForeignKey
ALTER TABLE "SlideshowSlide" ADD CONSTRAINT "SlideshowSlide_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SlideshowSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
