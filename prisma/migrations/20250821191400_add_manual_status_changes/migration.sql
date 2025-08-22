-- CreateTable
CREATE TABLE "ManualStatusChange" (
    "id" TEXT NOT NULL,
    "classDayId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManualStatusChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ManualStatusChange_classDayId_studentId_key" ON "ManualStatusChange"("classDayId", "studentId");

-- AddForeignKey
ALTER TABLE "ManualStatusChange" ADD CONSTRAINT "ManualStatusChange_classDayId_fkey" FOREIGN KEY ("classDayId") REFERENCES "ClassDay"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualStatusChange" ADD CONSTRAINT "ManualStatusChange_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualStatusChange" ADD CONSTRAINT "ManualStatusChange_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
