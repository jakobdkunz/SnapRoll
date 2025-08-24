-- DropIndex
DROP INDEX "ClassDay_attendanceCode_idx";

-- DropIndex
DROP INDEX "ClassDay_code_expires_idx";

-- AlterTable
ALTER TABLE "ClassDay" ALTER COLUMN "attendanceCodeExpiresAt" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "WordCloudSession" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "showPromptToStudents" BOOLEAN NOT NULL DEFAULT true,
    "allowMultipleAnswers" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "instructorLastSeenAt" TIMESTAMP(3),

    CONSTRAINT "WordCloudSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WordCloudAnswer" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WordCloudAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WordCloudSession_sectionId_idx" ON "WordCloudSession"("sectionId");

-- CreateIndex
CREATE INDEX "WordCloudAnswer_sessionId_idx" ON "WordCloudAnswer"("sessionId");

-- CreateIndex
CREATE INDEX "WordCloudAnswer_studentId_idx" ON "WordCloudAnswer"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "WordCloudAnswer_sessionId_studentId_text_key" ON "WordCloudAnswer"("sessionId", "studentId", "text");

-- AddForeignKey
ALTER TABLE "WordCloudSession" ADD CONSTRAINT "WordCloudSession_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordCloudAnswer" ADD CONSTRAINT "WordCloudAnswer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WordCloudSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordCloudAnswer" ADD CONSTRAINT "WordCloudAnswer_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
