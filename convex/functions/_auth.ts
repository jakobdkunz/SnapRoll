import type { Id } from "../_generated/dataModel";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import { DEMO_STUDENTS, DEMO_INSTRUCTORS } from "./seed";

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
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}

/**
 * Get the default demo email for a role.
 * Students default to Alice Anderson, Teachers default to James Mitchell.
 */
function getDefaultDemoEmail(role: "TEACHER" | "STUDENT"): string {
  if (role === "TEACHER") {
    return DEMO_INSTRUCTORS[0].email; // james.mitchell@example.com
  }
  return DEMO_STUDENTS[0].email; // alice.anderson@example.com
}

/**
 * Validate that an email belongs to a valid demo user of the given role.
 */
function isValidDemoEmail(email: string, role: "TEACHER" | "STUDENT"): boolean {
  const cleanEmail = email.trim().toLowerCase();
  if (role === "TEACHER") {
    return DEMO_INSTRUCTORS.some(i => i.email === cleanEmail);
  }
  return DEMO_STUDENTS.some(s => s.email === cleanEmail);
}

/**
 * Get or create a demo user. In demo mode, we use a fixed demo user.
 * Note: Can only create users in mutation context. In query context, user must already exist.
 * 
 * @param ctx - Convex context
 * @param role - The role to require (TEACHER or STUDENT)
 * @param overrideEmail - Optional email to use instead of the default demo user
 */
async function getDemoUser(
  ctx: QueryCtx | MutationCtx,
  role: "TEACHER" | "STUDENT",
  overrideEmail?: string
): Promise<AuthenticatedUser> {
  // Use override email if provided and valid, otherwise use default
  let demoEmail: string;
  if (overrideEmail && isValidDemoEmail(overrideEmail, role)) {
    demoEmail = overrideEmail.trim().toLowerCase();
  } else {
    demoEmail = getDefaultDemoEmail(role);
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", demoEmail))
    .first();
  
  if (!user) {
    throw new Error(`Demo user not found: ${demoEmail}. Please run seedDemoData first.`);
  }
  
  // Verify role matches
  if (user.role !== role) {
    throw new Error(`Demo user ${demoEmail} has role ${user.role}, expected ${role}`);
  }
  
  return user as AuthenticatedUser;
}

/**
 * Fetch the current authenticated user document from the database.
 * Throws if unauthenticated or not provisioned.
 * In demo mode, returns a demo user without checking auth.
 * 
 * @param ctx - Convex context
 * @param demoUserEmail - Optional email override for demo mode
 */
export async function requireCurrentUser(
  ctx: QueryCtx | MutationCtx,
  demoUserEmail?: string
): Promise<AuthenticatedUser> {
  if (isDemoMode()) {
    // In demo mode, resolve the provided demo user email across both roles.
    // If no valid override is provided, default to teacher for back-compat.
    const clean = (demoUserEmail ?? "").trim().toLowerCase();
    if (clean) {
      if (isValidDemoEmail(clean, "STUDENT")) {
        return await getDemoUser(ctx, "STUDENT", clean);
      }
      if (isValidDemoEmail(clean, "TEACHER")) {
        return await getDemoUser(ctx, "TEACHER", clean);
      }
    }
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

/**
 * Require the current user to be a teacher.
 * In demo mode, returns a demo teacher user.
 * 
 * @param ctx - Convex context
 * @param demoUserEmail - Optional email override for demo mode
 */
export async function requireTeacher(
  ctx: QueryCtx | MutationCtx,
  demoUserEmail?: string
): Promise<AuthenticatedUser> {
  if (isDemoMode()) {
    return await getDemoUser(ctx, "TEACHER", demoUserEmail);
  }
  const user = await requireCurrentUser(ctx);
  if (user.role !== "TEACHER") throw new Error("Forbidden");
  return user;
}

/**
 * Require the current user to be a student.
 * In demo mode, returns a demo student user.
 * 
 * @param ctx - Convex context
 * @param demoUserEmail - Optional email override for demo mode
 */
export async function requireStudent(
  ctx: QueryCtx | MutationCtx,
  demoUserEmail?: string
): Promise<AuthenticatedUser> {
  if (isDemoMode()) {
    return await getDemoUser(ctx, "STUDENT", demoUserEmail);
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
  const section = await ctx.db.get(sectionId);
  if (!section) throw new Error("Forbidden");
  // In demo mode, teacher pages may omit demoUserEmail in some calls.
  // Allow access to existing sections to avoid cross-page identity drift.
  if (isDemoMode()) return section;
  const teacherIdToCheck = teacherUserId ?? (await requireTeacher(ctx))._id;
  if (section.teacherId !== teacherIdToCheck) throw new Error("Forbidden");
  return section;
}

export async function requireStudentEnrollment(
  ctx: QueryCtx | MutationCtx,
  sectionId: Id<"sections">,
  demoUserEmail?: string
) {
  const user = await requireStudent(ctx, demoUserEmail);
  const enrollment = await ctx.db
    .query("enrollments")
    .withIndex("by_section_student", (q) => q.eq("sectionId", sectionId).eq("studentId", user._id))
    .first();
  if (!enrollment || enrollment.removedAt !== undefined) throw new Error("Forbidden");
  return { user, enrollment };
}
