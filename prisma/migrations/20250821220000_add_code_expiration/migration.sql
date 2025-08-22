-- Add attendanceCodeExpiresAt to ClassDay
ALTER TABLE "ClassDay"
ADD COLUMN IF NOT EXISTS "attendanceCodeExpiresAt" TIMESTAMP;

-- Optional index to query valid codes quickly
CREATE INDEX IF NOT EXISTS "ClassDay_attendanceCode_idx" ON "ClassDay" ("attendanceCode");
CREATE INDEX IF NOT EXISTS "ClassDay_code_expires_idx" ON "ClassDay" ("attendanceCodeExpiresAt");


