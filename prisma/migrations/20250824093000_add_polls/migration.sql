-- CreateTable PollSession
CREATE TABLE "PollSession" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "optionsJson" TEXT NOT NULL,
    "showResults" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "instructorLastSeenAt" TIMESTAMP(3),
    CONSTRAINT "PollSession_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "PollSession_sectionId_idx" ON "PollSession"("sectionId");

-- FKs
ALTER TABLE "PollSession"
  ADD CONSTRAINT "PollSession_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable PollAnswer
CREATE TABLE "PollAnswer" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "optionIdx" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PollAnswer_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "PollAnswer_sessionId_idx" ON "PollAnswer"("sessionId");
CREATE INDEX "PollAnswer_studentId_idx" ON "PollAnswer"("studentId");
ALTER TABLE "PollAnswer" ADD CONSTRAINT "PollAnswer_sessionId_studentId_key" UNIQUE ("sessionId", "studentId");

-- FKs
ALTER TABLE "PollAnswer"
  ADD CONSTRAINT "PollAnswer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PollSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PollAnswer"
  ADD CONSTRAINT "PollAnswer_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


