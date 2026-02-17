import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { DEMO_STUDENTS, DEMO_INSTRUCTORS, seedDemoDataHandler } from "./seed";

// Build a set of valid demo emails for quick lookup
const VALID_DEMO_EMAILS: Set<string> = new Set([
  ...DEMO_STUDENTS.map(s => s.email),
  ...DEMO_INSTRUCTORS.map(i => i.email),
]);

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

/**
 * Get a user by email. In demo mode, allows lookup of any demo user.
 * In non-demo mode, this query is forbidden.
 */
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    // This query is intended for demo flows only
    if (process.env.DEMO_MODE !== "true") {
      throw new Error("Forbidden");
    }
    const clean = args.email.trim().toLowerCase();
    
    // Only allow lookup of valid demo users
    if (!VALID_DEMO_EMAILS.has(clean)) {
      throw new Error("Forbidden: not a valid demo user email");
    }
    
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", clean))
      .first();
  },
});

/**
 * Get the current user. In demo mode, accepts an optional demoUserEmail parameter
 * to specify which demo user to return.
 */
export const getCurrentUser = query({
  args: {
    demoUserEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // In demo mode, return the specified demo user or default
    if (process.env.DEMO_MODE === "true") {
      let demoEmail: string;
      
      if (args.demoUserEmail) {
        const clean = args.demoUserEmail.trim().toLowerCase();
        // Validate it's a known demo user
        if (VALID_DEMO_EMAILS.has(clean)) {
          demoEmail = clean;
        } else {
          // Fall back to default (James Mitchell for teacher context)
          demoEmail = DEMO_INSTRUCTORS[0].email;
        }
      } else {
        // Default to James Mitchell (first instructor)
        demoEmail = DEMO_INSTRUCTORS[0].email;
      }
      
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", demoEmail))
        .first();
      
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

/**
 * Get the current student user. In demo mode, accepts an optional demoUserEmail parameter.
 * This is specifically for student-facing queries.
 */
export const getCurrentStudent = query({
  args: {
    demoUserEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // In demo mode, return the specified demo student or default
    if (process.env.DEMO_MODE === "true") {
      let demoEmail: string;
      
      if (args.demoUserEmail) {
        const clean = args.demoUserEmail.trim().toLowerCase();
        // Validate it's a known demo student
        const isValidStudent = DEMO_STUDENTS.some(s => s.email === clean);
        if (isValidStudent) {
          demoEmail = clean;
        } else {
          // Fall back to default (Alice Anderson)
          demoEmail = DEMO_STUDENTS[0].email;
        }
      } else {
        // Default to Alice Anderson (first student)
        demoEmail = DEMO_STUDENTS[0].email;
      }
      
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", demoEmail))
        .first();
      
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
        .filter((q) => q.eq(q.field("role"), "STUDENT"))
        .first();
      if (userByEmail) return userByEmail;
    }
    
    // Fall back to tokenIdentifier
    const tokenId = identity.tokenIdentifier;
    if (tokenId) {
      const userByToken = await ctx.db
        .query("users")
        .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", tokenId))
        .first();
      if (userByToken && userByToken.role === "STUDENT") return userByToken;
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

/**
 * Ensure demo data exists. Call this from the frontend when in demo mode.
 * This mutation is idempotent - if demo data already exists, it does nothing.
 * Returns true if data was seeded, false if it already existed.
 */
export const ensureDemoDataExists = mutation({
  args: {},
  handler: async (ctx) => {
    // Only works in demo mode
    if (process.env.DEMO_MODE !== "true") {
      // In non-demo mode, just return false silently
      return { seeded: false, reason: "not_demo_mode" };
    }

    // Check if demo data already exists by looking for the first instructor
    const firstInstructor = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", DEMO_INSTRUCTORS[0].email))
      .first();

    if (firstInstructor) {
      // Demo data already exists
      return { seeded: false, reason: "already_exists" };
    }

    // Seed demo data
    await seedDemoDataHandler(ctx);
    return { seeded: true, reason: "seeded" };
  },
});
