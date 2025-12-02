import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { requireTeacher } from "./_auth";
import { getEasternStartOfDay } from "./_tz";
import { seedDemoDataHandler } from "./seed";

export const hello = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return `Hello ${args.name}!`;
  },
});

export const generateDemoData = mutation({
  args: {
    sectionTitle: v.string(),
    studentCount: v.number(),
    daysBack: v.number(), // 30 => today and previous 30 (31 total days)
    percentages: v.object({
      present: v.number(),
      presentManual: v.number(),
      absentManual: v.number(),
      blank: v.number(),
      notEnrolledManual: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx);

    const title = (args.sectionTitle || "").trim();
    if (title.length === 0 || title.length > 200) throw new Error("Title must be 1-200 chars");

    const studentCount = Math.max(1, Math.min(500, Math.floor(args.studentCount)));
    const daysBack = Math.max(0, Math.min(120, Math.floor(args.daysBack)));

    const { present, presentManual, absentManual, blank, notEnrolledManual } = args.percentages;
    const total = present + presentManual + absentManual + blank + notEnrolledManual;
    if (total !== 100) throw new Error("Percentages must add up to 100");
    for (const n of [present, presentManual, absentManual, blank, notEnrolledManual]) {
      if (n < 0) throw new Error("Percentages cannot be negative");
    }

    // Create section with join code
    async function nextJoinCode(): Promise<string> {
      while (true) {
        const c = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
        const existing = await ctx.db.query('sections').withIndex('by_joinCode', q => q.eq('joinCode', c)).first();
        if (!existing) return c;
      }
    }
    const sectionId = await ctx.db.insert("sections", {
      title,
      gradient: "gradient-1",
      teacherId: teacher._id as Id<'users'>,
      joinCode: await nextJoinCode(),
    });

    // Name pools
    const firstNames = [
      "Alex","Jordan","Taylor","Sam","Jamie","Casey","Drew","Morgan","Riley","Cameron",
      "Avery","Quinn","Reese","Rowan","Elliot","Charlie","Emerson","Finley","Hayden","Jules",
    ];
    const lastNames = [
      "Kim","Lee","Chen","Patel","Cruz","Garcia","Singh","Nguyen","Khan","Diaz",
      "Lopez","Hernandez","Wong","Murphy","Johnson","Smith","Brown","Davis","Miller","Wilson",
    ];

    // Create students and enroll them
    const now = Date.now();
    const studentIds: Id<'users'>[] = [] as unknown as Id<'users'>[];
    for (let i = 0; i < studentCount; i++) {
      const fn = firstNames[i % firstNames.length];
      const ln = lastNames[Math.floor(i / firstNames.length) % lastNames.length];
      const emailSlug = `${fn}.${ln}.${i}`.toLowerCase();
      const studentId = await ctx.db.insert("users", {
        email: `${emailSlug}@example.com`,
        firstName: fn,
        lastName: ln,
        role: "STUDENT",
      });
      studentIds.push(studentId as Id<'users'>);
      await ctx.db.insert("enrollments", {
        sectionId: sectionId as Id<'sections'>,
        studentId: studentId as Id<'users'>,
        createdAt: now - 365 * 24 * 60 * 60 * 1000, // enrolled long before earliest day
      });
    }

    // Helper to draw a category by percentages
    type Category = "present" | "presentManual" | "absentManual" | "blank" | "notEnrolledManual";
    const thresholds: Array<{ key: Category; upto: number }> = [
      { key: "present", upto: present },
      { key: "presentManual", upto: present + presentManual },
      { key: "absentManual", upto: present + presentManual + absentManual },
      { key: "blank", upto: present + presentManual + absentManual + blank },
      { key: "notEnrolledManual", upto: 100 },
    ];
    function pickCategory(): Category {
      const r = Math.random() * 100;
      return thresholds.find(t => r < t.upto)!.key;
    }

    // Create class days and populate statuses
    const DAY_MS = 24 * 60 * 60 * 1000;
    const results: Array<{ classDayId: Id<'classDays'>; date: number }> = [];
    for (let i = 0; i <= daysBack; i++) {
      const dayStart = getEasternStartOfDay(now - i * DAY_MS);
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      const classDayId = await ctx.db.insert("classDays", {
        sectionId: sectionId as Id<'sections'>,
        date: dayStart,
        attendanceCode: code,
        attendanceCodeExpiresAt: dayStart + DAY_MS,
      });
      results.push({ classDayId: classDayId as Id<'classDays'>, date: dayStart });

      // Assign per-student status
      for (const sid of studentIds) {
        const cat = pickCategory();
        if (cat === "present") {
          await ctx.db.insert("attendanceRecords", {
            classDayId: classDayId as Id<'classDays'>,
            studentId: sid,
            status: "PRESENT",
          });
        } else if (cat === "presentManual") {
          await ctx.db.insert("manualStatusChanges", {
            classDayId: classDayId as Id<'classDays'>,
            studentId: sid,
            teacherId: teacher._id as Id<'users'>,
            status: "PRESENT",
            createdAt: dayStart + 9 * 60 * 60 * 1000,
          });
        } else if (cat === "absentManual") {
          await ctx.db.insert("manualStatusChanges", {
            classDayId: classDayId as Id<'classDays'>,
            studentId: sid,
            teacherId: teacher._id as Id<'users'>,
            status: "ABSENT",
            createdAt: dayStart + 9 * 60 * 60 * 1000,
          });
        } else if (cat === "blank") {
          // Do nothing: leave as BLANK (no record, no manual). Fallback after EOD will mark ABSENT/NOT_JOINED.
        } else if (cat === "notEnrolledManual") {
          await ctx.db.insert("manualStatusChanges", {
            classDayId: classDayId as Id<'classDays'>,
            studentId: sid,
            teacherId: teacher._id as Id<'users'>,
            status: "NOT_JOINED",
            createdAt: dayStart + 9 * 60 * 60 * 1000,
          });
        }
      }
    }

    return {
      sectionId,
      studentIds,
      classDays: results,
      daysGenerated: results.length,
      studentsGenerated: studentIds.length,
    };
  },
});

/**
 * Reset all demo data. Only works in demo mode.
 * Deletes all data and reseeds with fresh demo data.
 */
export const resetDemoData = mutation({
  args: {},
  handler: async (ctx) => {
    // Only allow in demo mode
    if (process.env.DEMO_MODE !== "true") {
      throw new Error("Reset is only available in demo mode");
    }

    // Delete all data from all tables
    // We'll delete in reverse dependency order to avoid foreign key issues
    
    // Delete all child records first
    const tablesToClear = [
      "pointsAssignments",
      "pointsOpportunities",
      "biblePassageSessions",
      "slideshowSlides",
      "slideshowSessions",
      "slideshowAssets",
      "pollAnswers",
      "pollSessions",
      "wordCloudAnswers",
      "wordCloudSessions",
      "manualStatusChanges",
      "attendanceRecords",
      "classDays",
      "enrollments",
      "sections",
      "rateLimits",
      "users",
    ];

    for (const tableName of tablesToClear) {
      const allRecords = await ctx.db.query(tableName as any).collect();
      for (const record of allRecords) {
        await ctx.db.delete(record._id);
      }
    }

    // Now reseed with demo data
    await seedDemoDataHandler(ctx);

    return { message: "Demo data reset successfully" };
  },
});
