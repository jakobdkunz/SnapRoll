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
 * Fetch the current authenticated user document from the database.
 * Throws if unauthenticated or not provisioned.
 */
export async function requireCurrentUser(ctx: QueryCtx | MutationCtx): Promise<AuthenticatedUser> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  const email = (identity.email ?? identity.tokenIdentifier ?? "")
    .toString()
    .trim()
    .toLowerCase();
  if (!email) throw new Error("Unauthenticated");
  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email))
    .first();
  if (!user) throw new Error("User not provisioned");
  return user as AuthenticatedUser;
}

export async function requireTeacher(ctx: QueryCtx | MutationCtx): Promise<AuthenticatedUser> {
  const user = await requireCurrentUser(ctx);
  if (user.role !== "TEACHER") throw new Error("Forbidden");
  return user;
}

export async function requireStudent(ctx: QueryCtx | MutationCtx): Promise<AuthenticatedUser> {
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


