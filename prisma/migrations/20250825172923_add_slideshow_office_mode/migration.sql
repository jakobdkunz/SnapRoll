-- DropForeignKey
ALTER TABLE "PollAnswer" DROP CONSTRAINT "PollAnswer_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "PollAnswer" DROP CONSTRAINT "PollAnswer_studentId_fkey";

-- DropForeignKey
ALTER TABLE "PollSession" DROP CONSTRAINT "PollSession_sectionId_fkey";

-- DropForeignKey
ALTER TABLE "SlideshowAsset" DROP CONSTRAINT "SlideshowAsset_teacherId_fkey";

-- DropForeignKey
ALTER TABLE "SlideshowSession" DROP CONSTRAINT "SlideshowSession_sectionId_fkey";

-- AlterTable
ALTER TABLE "SlideshowSession" ADD COLUMN     "officeMode" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "PollSession" ADD CONSTRAINT "PollSession_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollAnswer" ADD CONSTRAINT "PollAnswer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PollSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollAnswer" ADD CONSTRAINT "PollAnswer_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlideshowSession" ADD CONSTRAINT "SlideshowSession_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlideshowAsset" ADD CONSTRAINT "SlideshowAsset_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
