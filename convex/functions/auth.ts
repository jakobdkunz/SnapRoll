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
    // This query is intended for demo flows only (e.g. fetching demo-student / demo-teacher).
    // Avoid exposing arbitrary user lookup by email in non-demo deployments.
    if (process.env.DEMO_MODE !== "true") {
      throw new Error("Forbidden");
    }
    const clean = args.email.trim().toLowerCase();
    if (clean !== "demo-teacher@example.com" && clean !== "demo-student@example.com") {
      throw new Error("Forbidden");
    }
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    // In demo mode, return demo teacher user
    if (process.env.DEMO_MODE === "true") {
      const demoEmail = "demo-teacher@example.com";
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", demoEmail))
        .first();
      
      // In query context, user must already exist (created by seed function)
      return user;
    }
    
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    
    // Try email first (standard OIDC claim)
    const email = (identity.email ?? "").toString().trim().toLowerCase();
    if (email) {
      const userByEmail = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();
      if (userByEmail) return userByEmail;
    }
    
    // Fall back to tokenIdentifier (for providers like WorkOS that don't include email in access token)
    const tokenId = identity.tokenIdentifier;
    if (tokenId) {
      const userByToken = await ctx.db
        .query("users")
        .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", tokenId))
        .first();
      if (userByToken) return userByToken;
    }
    
    return null;
  },
});

export const upsertCurrentUser = mutation({
  args: {
    role: v.union(v.literal("TEACHER"), v.literal("STUDENT")),
    // Email passed from frontend (needed for providers like WorkOS where JWT doesn't include email)
    email: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null as unknown as Id<'users'>;

    // Get tokenIdentifier for WorkOS/custom auth providers
    const tokenIdentifier = identity.tokenIdentifier;
    
    // Email: prefer JWT claim, fall back to passed argument
    const email = (identity.email ?? args.email ?? "").toString().trim().toLowerCase();
    if (!email && !tokenIdentifier) return null as unknown as Id<'users'>;

    // First try to find by tokenIdentifier (most reliable for custom auth)
    let existing = tokenIdentifier 
      ? await ctx.db.query("users").withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", tokenIdentifier)).first()
      : null;
    
    // If not found by tokenIdentifier, try by email
    if (!existing && email) {
      existing = await ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", email)).first();
    }

    if (existing) {
      // Update role if different, and ensure tokenIdentifier is stored
      const updates: Record<string, string> = {};
      if (existing.role !== args.role) updates.role = args.role;
      if (tokenIdentifier && existing.tokenIdentifier !== tokenIdentifier) updates.tokenIdentifier = tokenIdentifier;
      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(existing._id as Id<"users">, updates);
      }
      return existing._id;
    }

    // Create new user
    if (!email) return null as unknown as Id<'users'>;
    
    const name = (identity.name || "").trim();
    const [firstNameFromToken, ...rest] = name ? name.split(" ") : [identity.givenName || "", identity.familyName || ""];
    const created = await ctx.db.insert("users", {
      email,
      firstName: args.firstName || firstNameFromToken || identity.givenName || "",
      lastName: args.lastName || rest.join(" ") || identity.familyName || "",
      role: args.role,
      tokenIdentifier: tokenIdentifier || undefined,
    });
    return created;
  },
});
