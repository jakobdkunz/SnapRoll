import type { Id } from "../_generated/dataModel";
import type { QueryCtx, MutationCtx } from "../_generated/server";

type Role = "TEACHER" | "STUDENT";

export interface AuthenticatedUser {
  _id: Id<"users">;
  email: string;
  firstName?: string;
  lastName?: string;
  role: Role;
}

/**
 * Check if demo mode is enabled via environment variable.
 */
function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}

/**
 * Get or create a demo user. In demo mode, we use a fixed demo user.
 * Note: Can only create users in mutation context. In query context, user must already exist.
 */
async function getDemoUser(ctx: QueryCtx | MutationCtx, role: "TEACHER" | "STUDENT"): Promise<AuthenticatedUser> {
  const demoEmail = role === "TEACHER" ? "demo-teacher@example.com" : "demo-student@example.com";
  let user = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", demoEmail))
    .first();
  
  if (!user) {
    // Only create in mutation context
    if ("insert" in ctx.db) {
      const userId = await (ctx.db as any).insert("users", {
        email: demoEmail,
        firstName: role === "TEACHER" ? "Demo" : "Demo",
        lastName: role === "TEACHER" ? "Teacher" : "Student",
        role,
      });
      // Query again to get the created user
      const createdUser = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", demoEmail))
        .first();
      if (!createdUser) throw new Error("Failed to create demo user");
      return createdUser as AuthenticatedUser;
    } else {
      throw new Error("Demo user not found. Please run seedDemoData first.");
    }
  }
  
  return user as AuthenticatedUser;
}

/**
 * Fetch the current authenticated user document from the database.
 * Throws if unauthenticated or not provisioned.
 * In demo mode, returns a demo user without checking auth.
 */
export async function requireCurrentUser(ctx: QueryCtx | MutationCtx): Promise<AuthenticatedUser> {
  if (isDemoMode()) {
    // In demo mode, default to teacher role for most operations
    // Individual functions can override by calling requireTeacher/requireStudent
    return await getDemoUser(ctx, "TEACHER");
  }
  
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  
  // Try to find user by email first (standard OIDC)
  const email = (identity.email ?? "").toString().trim().toLowerCase();
  if (email) {
    const userByEmail = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (userByEmail) return userByEmail as AuthenticatedUser;
  }
  
  // Fall back to tokenIdentifier (for providers like WorkOS that don't include email in access token)
  const tokenId = identity.tokenIdentifier;
  if (tokenId) {
    const userByToken = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", tokenId))
      .first();
    if (userByToken) return userByToken as AuthenticatedUser;
  }
  
  throw new Error("User not provisioned");
}

export async function requireTeacher(ctx: QueryCtx | MutationCtx): Promise<AuthenticatedUser> {
  if (isDemoMode()) {
    return await getDemoUser(ctx, "TEACHER");
  }
  const user = await requireCurrentUser(ctx);
  if (user.role !== "TEACHER") throw new Error("Forbidden");
  return user;
}

export async function requireStudent(ctx: QueryCtx | MutationCtx): Promise<AuthenticatedUser> {
  if (isDemoMode()) {
    return await getDemoUser(ctx, "STUDENT");
  }
  const user = await requireCurrentUser(ctx);
  if (user.role !== "STUDENT") throw new Error("Forbidden");
  return user;
}

export async function requireTeacherOwnsSection(
  ctx: QueryCtx | MutationCtx,
  sectionId: Id<"sections">,
  teacherUserId?: Id<"users">
) {
  const teacherIdToCheck = teacherUserId ?? (await requireTeacher(ctx))._id;
  const section = await ctx.db.get(sectionId);
  if (!section || section.teacherId !== teacherIdToCheck) throw new Error("Forbidden");
  return section;
}

export async function requireStudentEnrollment(
  ctx: QueryCtx | MutationCtx,
  sectionId: Id<"sections">
) {
  const user = await requireStudent(ctx);
  const enrollment = await ctx.db
    .query("enrollments")
    .withIndex("by_section_student", (q) => q.eq("sectionId", sectionId).eq("studentId", user._id))
    .first();
  if (!enrollment) throw new Error("Forbidden");
  return { user, enrollment };
}


