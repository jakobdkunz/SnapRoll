import { mutation, type MutationCtx } from "../_generated/server";

/**
 * Shared function to seed demo data. Can be called from mutations.
 */
export async function seedDemoDataHandler(ctx: MutationCtx) {
    // Create demo teacher (email must match _auth.ts getDemoUser)
    const teacherId = await ctx.db.insert("users", {
      email: "demo-teacher@example.com",
      firstName: "Demo",
      lastName: "Teacher",
      role: "TEACHER",
    });
    
    // Also create demo student user (for student views)
    await ctx.db.insert("users", {
      email: "demo-student@example.com",
      firstName: "Demo",
      lastName: "Student",
      role: "STUDENT",
    });

    // Create demo students
    const studentIds = await Promise.all([
      ctx.db.insert("users", {
        email: "alex.kim@example.com",
        firstName: "Alex",
        lastName: "Kim",
        role: "STUDENT",
      }),
      ctx.db.insert("users", {
        email: "jordan.lee@example.com",
        firstName: "Jordan",
        lastName: "Lee",
        role: "STUDENT",
      }),
      ctx.db.insert("users", {
        email: "taylor.chen@example.com",
        firstName: "Taylor",
        lastName: "Chen",
        role: "STUDENT",
      }),
      ctx.db.insert("users", {
        email: "sam.patel@example.com",
        firstName: "Sam",
        lastName: "Patel",
        role: "STUDENT",
      }),
      ctx.db.insert("users", {
        email: "jamie.cruz@example.com",
        firstName: "Jamie",
        lastName: "Cruz",
        role: "STUDENT",
      }),
    ]);

    // Create demo sections
    async function nextJoinCode(): Promise<string> {
      while (true) {
        const c = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
        const existing = await ctx.db.query('sections').withIndex('by_joinCode', q => q.eq('joinCode', c)).first();
        if (!existing) return c;
      }
    }
    const sectionIds = await Promise.all([
      ctx.db.insert("sections", {
        title: "Algebra I - Period 1",
        gradient: "gradient-1",
        teacherId,
        joinCode: await nextJoinCode(),
      }),
      ctx.db.insert("sections", {
        title: "Geometry - Period 2",
        gradient: "gradient-2",
        teacherId,
        joinCode: await nextJoinCode(),
      }),
    ]);

    // Enroll students in sections
    const enrollments = [];
    for (const studentId of studentIds) {
      for (const sectionId of sectionIds) {
        enrollments.push(
          ctx.db.insert("enrollments", {
            sectionId,
            studentId,
            createdAt: Date.now(),
          })
        );
      }
    }
    await Promise.all(enrollments);

    // Create demo class days
    const today = Date.now();
    const classDayIds = await Promise.all(
      sectionIds.map((sectionId, i) =>
        ctx.db.insert("classDays", {
          sectionId,
          date: today - i * 24 * 60 * 60 * 1000, // Previous days
          attendanceCode: (1000 + i).toString(),
          attendanceCodeExpiresAt: today + 30 * 60 * 1000, // 30 minutes from now
        })
      )
    );

    // Create demo attendance records
    const attendanceRecords = [];
    for (const studentId of studentIds) {
      for (const classDayId of classDayIds) {
        const statuses = ["PRESENT", "ABSENT", "EXCUSED", "NOT_JOINED", "BLANK"];
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
        
        attendanceRecords.push(
          ctx.db.insert("attendanceRecords", {
            classDayId,
            studentId,
            status: randomStatus as any,
          })
        );
      }
    }
    await Promise.all(attendanceRecords);

    return {
      message: "Demo data seeded successfully",
      teacherId,
      studentIds,
      sectionIds,
      classDayIds,
    };
}

export const seedDemoData = mutation({
  args: {},
  handler: async (ctx) => {
    return await seedDemoDataHandler(ctx);
  },
});
