import { mutation, type MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

// ============================================================================
// DEMO USER DEFINITIONS
// ============================================================================

// Note: These arrays are NOT `as const` to allow proper string type inference

// Students: 26 total (A-Z), first 5 are active demo users
export const DEMO_STUDENTS = [
  // Active demo students (1-5)
  { firstName: "Alice", lastName: "Anderson", email: "alice.anderson@example.com" },
  { firstName: "Bob", lastName: "Bennett", email: "bob.bennett@example.com" },
  { firstName: "Carol", lastName: "Chen", email: "carol.chen@example.com" },
  { firstName: "Dave", lastName: "Davis", email: "dave.davis@example.com" },
  { firstName: "Eve", lastName: "Edwards", email: "eve.edwards@example.com" },
  // Greyed out students (6-26)
  { firstName: "Frank", lastName: "Foster", email: "frank.foster@example.com" },
  { firstName: "Grace", lastName: "Garcia", email: "grace.garcia@example.com" },
  { firstName: "Henry", lastName: "Harris", email: "henry.harris@example.com" },
  { firstName: "Iris", lastName: "Ingram", email: "iris.ingram@example.com" },
  { firstName: "Jack", lastName: "Johnson", email: "jack.johnson@example.com" },
  { firstName: "Kevin", lastName: "Kim", email: "kevin.kim@example.com" },
  { firstName: "Laura", lastName: "Lee", email: "laura.lee@example.com" },
  { firstName: "Mike", lastName: "Martinez", email: "mike.martinez@example.com" },
  { firstName: "Nina", lastName: "Nguyen", email: "nina.nguyen@example.com" },
  { firstName: "Oscar", lastName: "Ortiz", email: "oscar.ortiz@example.com" },
  { firstName: "Paula", lastName: "Patel", email: "paula.patel@example.com" },
  { firstName: "Quinn", lastName: "Quinn", email: "quinn.quinn@example.com" },
  { firstName: "Rachel", lastName: "Robinson", email: "rachel.robinson@example.com" },
  { firstName: "Steve", lastName: "Singh", email: "steve.singh@example.com" },
  { firstName: "Tina", lastName: "Thompson", email: "tina.thompson@example.com" },
  { firstName: "Uma", lastName: "Underwood", email: "uma.underwood@example.com" },
  { firstName: "Victor", lastName: "Valdez", email: "victor.valdez@example.com" },
  { firstName: "Wendy", lastName: "Williams", email: "wendy.williams@example.com" },
  { firstName: "Xavier", lastName: "Xu", email: "xavier.xu@example.com" },
  { firstName: "Yolanda", lastName: "Young", email: "yolanda.young@example.com" },
  { firstName: "Zack", lastName: "Zhang", email: "zack.zhang@example.com" },
];

// Instructors: 6 total, first 2 are active demo users
export const DEMO_INSTRUCTORS = [
  // Active demo instructors (1-2)
  { firstName: "James", lastName: "Mitchell", email: "james.mitchell@example.com" },
  { firstName: "Kimberly", lastName: "Nelson", email: "kimberly.nelson@example.com" },
  // Greyed out instructors (3-6) - L, M, N, O
  { firstName: "Larry", lastName: "Olsen", email: "larry.olsen@example.com" },
  { firstName: "Maria", lastName: "Perez", email: "maria.perez@example.com" },
  { firstName: "Nathan", lastName: "Quinn", email: "nathan.quinn@example.com" },
  { firstName: "Olivia", lastName: "Reynolds", email: "olivia.reynolds@example.com" },
];

// Course definitions per instructor
const JAMES_COURSES = [
  { title: "Introduction to Psychology", gradient: "gradient-1" },
  { title: "Research Methods", gradient: "gradient-3" },
  { title: "Statistics for Social Sciences", gradient: "gradient-4" },
  { title: "Abnormal Psychology", gradient: "gradient-9" },
];

const KIMBERLY_COURSES = [
  { title: "World History I", gradient: "gradient-2" },
  { title: "American Government", gradient: "gradient-6" },
  { title: "Economics 101", gradient: "gradient-7" },
  { title: "Sociology", gradient: "gradient-8" },
];

// Available gradients for reference
const GRADIENTS = [
  "gradient-1", "gradient-2", "gradient-3", "gradient-4",
  "gradient-6", "gradient-7", "gradient-8", "gradient-9",
];

// Class schedule patterns
type SchedulePattern = "MWF" | "TTh";

// Attendance profiles
type AttendanceProfile = "excellent" | "good" | "struggling";
const ATTENDANCE_PROFILES: Record<AttendanceProfile, { presentRate: number; excusedRate: number }> = {
  excellent: { presentRate: 1.0, excusedRate: 0 },      // 100% attendance
  good: { presentRate: 0.9, excusedRate: 0.05 },        // ~90% attendance
  struggling: { presentRate: 0.6, excusedRate: 0.1 },   // ~60% attendance
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a unique join code
 */
async function nextJoinCode(ctx: MutationCtx): Promise<string> {
  while (true) {
    const c = String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
    const existing = await ctx.db
      .query("sections")
      .withIndex("by_joinCode", (q) => q.eq("joinCode", c))
      .first();
    if (!existing) return c;
  }
}

/**
 * Get the start of day in Eastern timezone (approximation using UTC-5)
 */
function getEasternStartOfDay(timestamp: number): number {
  const d = new Date(timestamp);
  // Approximate Eastern time as UTC-5
  const eastern = new Date(d.getTime() - 5 * 60 * 60 * 1000);
  eastern.setUTCHours(0, 0, 0, 0);
  return eastern.getTime() + 5 * 60 * 60 * 1000;
}

/**
 * Check if a date falls on a specific day of week (0=Sun, 1=Mon, etc.)
 */
function getDayOfWeek(timestamp: number): number {
  return new Date(timestamp).getDay();
}

/**
 * Generate class days based on schedule pattern going back N weeks
 */
function generateClassDays(
  weeksBack: number,
  pattern: SchedulePattern,
  referenceDate: number
): number[] {
  const days: number[] = [];
  const DAY_MS = 24 * 60 * 60 * 1000;
  const startOfToday = getEasternStartOfDay(referenceDate);

  // Go back weeksBack * 7 days
  for (let i = 0; i <= weeksBack * 7; i++) {
    const dayTimestamp = startOfToday - i * DAY_MS;
    const dow = getDayOfWeek(dayTimestamp);

    if (pattern === "MWF") {
      // Monday = 1, Wednesday = 3, Friday = 5
      if (dow === 1 || dow === 3 || dow === 5) {
        days.push(dayTimestamp);
      }
    } else if (pattern === "TTh") {
      // Tuesday = 2, Thursday = 4
      if (dow === 2 || dow === 4) {
        days.push(dayTimestamp);
      }
    }
  }

  return days.sort((a, b) => a - b); // oldest first
}

/**
 * Assign attendance profile to a student (deterministic based on index)
 */
function assignAttendanceProfile(studentIndex: number): AttendanceProfile {
  // ~15% excellent, ~70% good, ~15% struggling
  // Use modulo to distribute deterministically
  const mod = studentIndex % 20;
  if (mod < 3) return "excellent"; // 0,1,2 = 15%
  if (mod >= 17) return "struggling"; // 17,18,19 = 15%
  return "good"; // 3-16 = 70%
}

/**
 * Determine attendance status for a student on a class day
 */
function rollAttendanceStatus(
  profile: AttendanceProfile,
  seed: number
): "PRESENT" | "ABSENT" | "EXCUSED" {
  const { presentRate, excusedRate } = ATTENDANCE_PROFILES[profile];
  
  // Use seed for pseudo-random but reproducible results
  const rand = Math.sin(seed * 9999) * 10000;
  const roll = rand - Math.floor(rand);

  if (roll < presentRate) {
    return "PRESENT";
  } else if (roll < presentRate + excusedRate) {
    return "EXCUSED";
  }
  return "ABSENT";
}

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

/**
 * Shared function to seed demo data. Can be called from mutations.
 */
export async function seedDemoDataHandler(ctx: MutationCtx) {
  const now = Date.now();
  const enrolledAt = now - 90 * 24 * 60 * 60 * 1000; // Enrolled 90 days ago

  // -------------------------------------------------------------------------
  // Create all instructors
  // -------------------------------------------------------------------------
  const instructorIds: Id<"users">[] = [];
  for (const instructor of DEMO_INSTRUCTORS) {
    const id = await ctx.db.insert("users", {
      email: instructor.email,
      firstName: instructor.firstName,
      lastName: instructor.lastName,
      role: "TEACHER",
    });
    instructorIds.push(id);
  }

  const jamesId = instructorIds[0];
  const kimberlyId = instructorIds[1];

  // -------------------------------------------------------------------------
  // Create all students
  // -------------------------------------------------------------------------
  const studentIds: Id<"users">[] = [];
  for (const student of DEMO_STUDENTS) {
    const id = await ctx.db.insert("users", {
      email: student.email,
      firstName: student.firstName,
      lastName: student.lastName,
      role: "STUDENT",
    });
    studentIds.push(id);
  }

  // -------------------------------------------------------------------------
  // Create sections (courses) for James and Kimberly
  // -------------------------------------------------------------------------
  interface SectionInfo {
    id: Id<"sections">;
    teacherId: Id<"users">;
    pattern: SchedulePattern;
    enrolledStudentIndices: number[];
  }
  const sections: SectionInfo[] = [];

  // James's courses (alternating MWF and TTh)
  for (let i = 0; i < JAMES_COURSES.length; i++) {
    const course = JAMES_COURSES[i];
    const pattern: SchedulePattern = i % 2 === 0 ? "MWF" : "TTh";
    const id = await ctx.db.insert("sections", {
      title: course.title,
      gradient: course.gradient,
      teacherId: jamesId,
      joinCode: await nextJoinCode(ctx),
    });
    sections.push({ id, teacherId: jamesId, pattern, enrolledStudentIndices: [] });
  }

  // Kimberly's courses (alternating TTh and MWF)
  for (let i = 0; i < KIMBERLY_COURSES.length; i++) {
    const course = KIMBERLY_COURSES[i];
    const pattern: SchedulePattern = i % 2 === 0 ? "TTh" : "MWF";
    const id = await ctx.db.insert("sections", {
      title: course.title,
      gradient: course.gradient,
      teacherId: kimberlyId,
      joinCode: await nextJoinCode(ctx),
    });
    sections.push({ id, teacherId: kimberlyId, pattern, enrolledStudentIndices: [] });
  }

  // -------------------------------------------------------------------------
  // Enroll students in sections
  // -------------------------------------------------------------------------
  // Enrollment strategy:
  // - Alice (0), Bob (1), Carol (2): Heavy enrollment - 3-4 James + 2-3 Kimberly
  // - Dave (3), Eve (4): Medium enrollment - 2 James + 1-2 Kimberly
  // - F-Z (5-25): Distributed to create 15-30 students per course

  const jamesSections = sections.filter(s => s.teacherId === jamesId);
  const kimberlySections = sections.filter(s => s.teacherId === kimberlyId);

  // Active demo students (heavy engagement)
  // Alice: All of James's courses, 3 of Kimberly's
  for (const s of jamesSections) s.enrolledStudentIndices.push(0);
  for (let i = 0; i < 3; i++) kimberlySections[i].enrolledStudentIndices.push(0);

  // Bob: 3 of James's courses, 2 of Kimberly's
  for (let i = 0; i < 3; i++) jamesSections[i].enrolledStudentIndices.push(1);
  for (let i = 0; i < 2; i++) kimberlySections[i].enrolledStudentIndices.push(1);

  // Carol: 3 of James's courses, 3 of Kimberly's
  for (let i = 0; i < 3; i++) jamesSections[i].enrolledStudentIndices.push(2);
  for (let i = 0; i < 3; i++) kimberlySections[i].enrolledStudentIndices.push(2);

  // Dave: 2 of James's, 2 of Kimberly's
  for (let i = 0; i < 2; i++) jamesSections[i].enrolledStudentIndices.push(3);
  for (let i = 0; i < 2; i++) kimberlySections[i].enrolledStudentIndices.push(3);

  // Eve: 2 of James's, 1 of Kimberly's
  for (let i = 0; i < 2; i++) jamesSections[i].enrolledStudentIndices.push(4);
  kimberlySections[0].enrolledStudentIndices.push(4);

  // Remaining students (5-25) distributed across all sections
  // Each section should have 15-30 total students
  for (let studentIdx = 5; studentIdx < DEMO_STUDENTS.length; studentIdx++) {
    // Distribute based on student index to create varied class sizes
    const sectionOffset = studentIdx % sections.length;
    
    // Each student enrolled in 2-4 random sections
    const numEnrollments = 2 + (studentIdx % 3); // 2, 3, or 4
    for (let j = 0; j < numEnrollments; j++) {
      const sectionIdx = (sectionOffset + j * 2) % sections.length;
      if (!sections[sectionIdx].enrolledStudentIndices.includes(studentIdx)) {
        sections[sectionIdx].enrolledStudentIndices.push(studentIdx);
      }
    }
  }

  // Create enrollment records
  for (const section of sections) {
    for (const studentIdx of section.enrolledStudentIndices) {
      await ctx.db.insert("enrollments", {
        sectionId: section.id,
        studentId: studentIds[studentIdx],
        createdAt: enrolledAt,
      });
    }
  }

  // -------------------------------------------------------------------------
  // Create class days and attendance records
  // -------------------------------------------------------------------------
  const WEEKS_BACK = 6; // 6 weeks of history

  for (const section of sections) {
    const classDayTimestamps = generateClassDays(WEEKS_BACK, section.pattern, now);

    for (let dayIdx = 0; dayIdx < classDayTimestamps.length; dayIdx++) {
      const dayTimestamp = classDayTimestamps[dayIdx];
      const code = String(1000 + Math.floor(Math.random() * 9000));
      
      // Create class day
      const classDayId = await ctx.db.insert("classDays", {
        sectionId: section.id,
        date: dayTimestamp,
        attendanceCode: code,
        attendanceCodeExpiresAt: dayTimestamp + 24 * 60 * 60 * 1000,
        hasActivity: true,
      });

      // Create attendance records for each enrolled student
      for (const studentIdx of section.enrolledStudentIndices) {
        const profile = assignAttendanceProfile(studentIdx);
        const seed = studentIdx * 1000 + dayIdx * 37 + section.enrolledStudentIndices.length;
        const status = rollAttendanceStatus(profile, seed);

        // Most records are automatic check-ins (PRESENT via code)
        // Some are manual status changes
        const isManualChange = Math.sin(seed * 7777) > 0.85; // ~15% manual

        if (status === "PRESENT" && !isManualChange) {
          // Student checked in via code
          await ctx.db.insert("attendanceRecords", {
            classDayId,
            studentId: studentIds[studentIdx],
            status: "PRESENT",
          });
        } else if (status === "EXCUSED" || isManualChange) {
          // Manual status change by teacher
          await ctx.db.insert("manualStatusChanges", {
            classDayId,
            studentId: studentIds[studentIdx],
            teacherId: section.teacherId,
            status: status,
            createdAt: dayTimestamp + 2 * 60 * 60 * 1000, // 2 hours after class start
          });
        } else {
          // ABSENT - either no record (implicit) or manual marking
          if (Math.sin(seed * 5555) > 0.5) {
            // Explicitly marked absent
            await ctx.db.insert("manualStatusChanges", {
              classDayId,
              studentId: studentIds[studentIdx],
              teacherId: section.teacherId,
              status: "ABSENT",
              createdAt: dayTimestamp + 24 * 60 * 60 * 1000, // End of day
            });
          }
          // Otherwise left as implicit absent (no record)
        }
      }
    }
  }

  return {
    message: "Demo data seeded successfully",
    instructorCount: instructorIds.length,
    studentCount: studentIds.length,
    sectionCount: sections.length,
    sectionsDetail: sections.map(s => ({
      id: s.id,
      studentCount: s.enrolledStudentIndices.length,
      pattern: s.pattern,
    })),
  };
}

export const seedDemoData = mutation({
  args: {},
  handler: async (ctx) => {
    return await seedDemoDataHandler(ctx);
  },
});
