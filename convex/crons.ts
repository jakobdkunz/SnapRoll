import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run shortly after 08:00 UTC daily to finalize previous days globally
crons.daily(
  "finalize past BLANK attendance to ABSENT",
  { hourUTC: 8, minuteUTC: 5 },
  internal.functions.attendance.finalizePastBlankToAbsent
);

export default crons;


