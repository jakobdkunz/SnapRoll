import type { Id } from "../_generated/dataModel";

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
export async function requireCurrentUser(ctx: any): Promise<AuthenticatedUser> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  const email = (identity.email ?? identity.tokenIdentifier ?? "")
    .toString()
    .trim()
    .toLowerCase();
  if (!email) throw new Error("Unauthenticated");
  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q: any) => q.eq("email", email))
    .first();
  if (!user) throw new Error("User not provisioned");
  return user as AuthenticatedUser;
}

export async function requireTeacher(ctx: any): Promise<AuthenticatedUser> {
  const user = await requireCurrentUser(ctx);
  if (user.role !== "TEACHER") throw new Error("Forbidden");
  return user;
}

export async function requireStudent(ctx: any): Promise<AuthenticatedUser> {
  const user = await requireCurrentUser(ctx);
  if (user.role !== "STUDENT") throw new Error("Forbidden");
  return user;
}

export async function requireTeacherOwnsSection(
  ctx: any,
  sectionId: Id<"sections">,
  teacherUserId?: Id<"users">
) {
  const user = teacherUserId ? { _id: teacherUserId } : await requireTeacher(ctx);
  const section = await ctx.db.get(sectionId);
  if (!section || section.teacherId !== (user as any)._id) throw new Error("Forbidden");
  return section;
}

export async function requireStudentEnrollment(
  ctx: any,
  sectionId: Id<"sections">
) {
  const user = await requireStudent(ctx);
  const enrollment = await ctx.db
    .query("enrollments")
    .withIndex("by_section_student", (q: any) => q.eq("sectionId", sectionId).eq("studentId", user._id))
    .first();
  if (!enrollment) throw new Error("Forbidden");
  return { user, enrollment };
}


