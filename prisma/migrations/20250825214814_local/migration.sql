-- DropForeignKey
ALTER TABLE "PollAnswer" DROP CONSTRAINT "PollAnswer_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "PollAnswer" DROP CONSTRAINT "PollAnswer_studentId_fkey";

-- DropForeignKey
ALTER TABLE "PollSession" DROP CONSTRAINT "PollSession_sectionId_fkey";

-- AddForeignKey
ALTER TABLE "PollSession" ADD CONSTRAINT "PollSession_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollAnswer" ADD CONSTRAINT "PollAnswer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PollSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollAnswer" ADD CONSTRAINT "PollAnswer_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
