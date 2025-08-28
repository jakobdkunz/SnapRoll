import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

export const authenticateTeacher = mutation({
  args: {
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cleanEmail = args.email.trim().toLowerCase();
    if (!cleanEmail) {
      throw new Error("Email required");
    }

    // Try to find existing teacher
    let teacher = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", cleanEmail))
      .filter((q) => q.eq(q.field("role"), "TEACHER"))
      .first();

    if (teacher) {
      return { teacher };
    }

    // If names provided, create new teacher
    if (args.firstName && args.lastName) {
      const firstName = args.firstName.trim();
      const lastName = args.lastName.trim();
      
      if (!firstName || !lastName) {
        throw new Error("First and last name required");
      }

      const teacherId = await ctx.db.insert("users", {
        email: cleanEmail,
        firstName,
        lastName,
        role: "TEACHER",
      });
      teacher = await ctx.db.get(teacherId);

      return { teacher };
    }

    // Teacher not found and no names provided
    return { found: false };
  },
});

export const authenticateStudent = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const cleanEmail = args.email.trim().toLowerCase();
    if (!cleanEmail) {
      throw new Error("Email required");
    }

    const student = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", cleanEmail))
      .filter((q) => q.eq(q.field("role"), "STUDENT"))
      .first();

    if (!student) {
      throw new Error("No student found with this email. Please ask your instructor to add you to a section.");
    }

    return { student };
  },
});

export const getUser = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const email = (identity.email ?? identity.tokenIdentifier ?? "")
      .toString()
      .trim()
      .toLowerCase();
    if (!email) return null;
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
  },
});

export const upsertCurrentUser = mutation({
  args: {
    role: v.union(v.literal("TEACHER"), v.literal("STUDENT")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null as unknown as Id<'users'>;

    const email = (identity.email ?? identity.tokenIdentifier ?? "").toString().trim().toLowerCase();
    if (!email) return null as unknown as Id<'users'>;

    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (existing) {
      if (existing.role !== args.role) {
        await ctx.db.patch(existing._id as Id<"users">, { role: args.role });
      }
      return existing._id;
    }

    const name = (identity.name || "").trim();
    const [firstName, ...rest] = name ? name.split(" ") : [identity.givenName || "", identity.familyName || ""];
    const created = await ctx.db.insert("users", {
      email,
      firstName: firstName || identity.givenName || "",
      lastName: rest.join(" ") || identity.familyName || "",
      role: args.role,
    });
    return created;
  },
});
