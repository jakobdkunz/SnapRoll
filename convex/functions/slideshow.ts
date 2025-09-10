import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { requireTeacher, requireTeacherOwnsSection, requireCurrentUser } from "./_auth";
import { checkAndIncrementRateLimit } from "./_rateLimit";

// Asset management
export const createAsset = mutation({
  args: {
    title: v.string(),
    filePath: v.string(),
    mimeType: v.string(),
    totalSlides: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx);
    const title = (args.title || "").trim();
    if (title.length === 0 || title.length > 200) throw new Error("Title must be 1-200 chars");
    const filePath = (args.filePath || "").trim();
    if (filePath.length === 0 || filePath.length > 1024) throw new Error("Invalid file path");
    const mimeType = (args.mimeType || "").trim();
    if (mimeType.length === 0 || mimeType.length > 100) throw new Error("Invalid mime type");
    return await ctx.db.insert("slideshowAssets", {
      teacherId: teacher._id,
      title,
      filePath,
      mimeType,
      totalSlides: args.totalSlides,
      createdAt: Date.now(),
    });
  },
});

export const getAssetsByTeacher = query({
  args: { teacherId: v.id("users") },
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx);
    if (teacher._id !== args.teacherId) throw new Error("Forbidden");
    return await ctx.db
      .query("slideshowAssets")
      .withIndex("by_teacher", (q) => q.eq("teacherId", args.teacherId))
      .collect();
  },
});

// Session management
export const startSlideshow = mutation({
  args: {
    sectionId: v.id("sections"),
    assetId: v.id("slideshowAssets"),
    currentSlide: v.optional(v.number()),
    showOnDevices: v.optional(v.boolean()),
    allowDownload: v.optional(v.boolean()),
    requireStay: v.optional(v.boolean()),
    preventJump: v.optional(v.boolean()),
    officeMode: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx);
    await requireTeacherOwnsSection(ctx, args.sectionId as Id<"sections">, teacher._id);
    const rl = await checkAndIncrementRateLimit(ctx, teacher._id, `ss:start:${args.sectionId}` as any, 5 * 60 * 1000, 60);
    if (!rl.allowed) throw new Error("Rate limited. Please wait a moment and try again.");
    // Idempotency: if an active session already exists for this section, reuse it
    const existing = await ctx.db
      .query("slideshowSessions")
      .withIndex("by_section_active", (q) => q.eq("sectionId", args.sectionId).eq("closedAt", undefined))
      .first();
    if (existing) return existing._id;
    // Default: do not show on devices until rendering finishes
    return await ctx.db.insert("slideshowSessions", {
      sectionId: args.sectionId,
      assetId: args.assetId,
      currentSlide: args.currentSlide ?? 1,
      showOnDevices: args.showOnDevices ?? false,
      allowDownload: args.allowDownload ?? true,
      requireStay: args.requireStay ?? false,
      preventJump: args.preventJump ?? false,
      officeMode: args.officeMode ?? false,
      createdAt: Date.now(),
    });
  },
});

export const getActiveSlideshow = query({
  args: { sectionId: v.id("sections") },
  handler: async (ctx, args) => {
    // Allow owner teacher or enrolled student to see session info
    try {
      const teacher = await requireTeacher(ctx);
      await requireTeacherOwnsSection(ctx, args.sectionId as Id<"sections">, teacher._id);
    } catch {
      // Not teacher owner; allow only enrolled students
      const identity = await ctx.auth.getUserIdentity();
      const email = (identity?.email ?? identity?.tokenIdentifier ?? "").toString().trim().toLowerCase();
      if (!email) throw new Error("Forbidden");
      const currentUser = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", email))
        .first();
      if (!currentUser) throw new Error("Forbidden");
      const enrollment = await ctx.db
        .query("enrollments")
        .withIndex("by_section_student", (q) => q.eq("sectionId", args.sectionId).eq("studentId", currentUser._id))
        .first();
      if (!enrollment) throw new Error("Forbidden");
    }
    return await ctx.db
      .query("slideshowSessions")
      .withIndex("by_section_active", (q) => 
        q.eq("sectionId", args.sectionId).eq("closedAt", undefined)
      )
      .first();
  },
});

export const closeSlideshow = mutation({
  args: { sessionId: v.id("slideshowSessions") },
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx);
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Slideshow session not found");
    await requireTeacherOwnsSection(ctx, session.sectionId as Id<"sections">, teacher._id);
    const rl = await checkAndIncrementRateLimit(ctx, teacher._id, `ss:close:${args.sessionId}` as any, 5 * 60 * 1000, 60);
    if (!rl.allowed) throw new Error("Rate limited. Please wait a moment and try again.");
    await ctx.db.patch(args.sessionId, {
      closedAt: Date.now(),
    });
  },
});

export const gotoSlide = mutation({
  args: {
    sessionId: v.id("slideshowSessions"),
    slideNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx);
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Slideshow session not found");
    await requireTeacherOwnsSection(ctx, session.sectionId as Id<"sections">, teacher._id);
    const rl = await checkAndIncrementRateLimit(ctx, teacher._id, `ss:goto:${args.sessionId}` as any, 5 * 60 * 1000, 300);
    if (!rl.allowed) throw new Error("Rate limited. Please wait a moment and try again.");
    // Avoid redundant writes
    if ((session.currentSlide as number | undefined) !== args.slideNumber) {
      await ctx.db.patch(args.sessionId, { currentSlide: args.slideNumber });
    }
  },
});

export const heartbeat = mutation({
  args: { sessionId: v.id("slideshowSessions") },
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx);
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Slideshow session not found");
    await requireTeacherOwnsSection(ctx, session.sectionId as Id<"sections">, teacher._id);
    const now = Date.now();
    const last = (session.instructorLastSeenAt as number | undefined) ?? 0;
    if (now - last > 5000) {
      await ctx.db.patch(args.sessionId, { instructorLastSeenAt: now });
    }
  },
});

// Slide management
export const addSlide = mutation({
  args: {
    sessionId: v.optional(v.id("slideshowSessions")),
    assetId: v.optional(v.id("slideshowAssets")),
    index: v.number(),
    imageUrl: v.string(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx);
    if (args.sessionId) {
      const session = await ctx.db.get(args.sessionId);
      if (!session) throw new Error("Slideshow session not found");
      await requireTeacherOwnsSection(ctx, session.sectionId as Id<"sections">, teacher._id);
    }
    if (args.assetId) {
      const asset = await ctx.db.get(args.assetId);
      if (!asset || asset.teacherId !== teacher._id) throw new Error("Forbidden");
    }
    return await ctx.db.insert("slideshowSlides", {
      sessionId: args.sessionId,
      assetId: args.assetId,
      index: args.index,
      imageUrl: args.imageUrl,
      width: args.width,
      height: args.height,
      createdAt: Date.now(),
    });
  },
});

export const getSlides = query({
  args: {
    sessionId: v.optional(v.id("slideshowSessions")),
    assetId: v.optional(v.id("slideshowAssets")),
  },
  handler: async (ctx, args) => {
    if (args.sessionId) {
      // Allow enrolled students to view, and owner teacher
      const session = await ctx.db.get(args.sessionId);
      if (!session) return [];
      try {
        const teacher = await requireTeacher(ctx);
        await requireTeacherOwnsSection(ctx, session.sectionId as Id<"sections">, teacher._id);
      } catch {
        const identity = await ctx.auth.getUserIdentity();
        const email = (identity?.email ?? identity?.tokenIdentifier ?? "").toString().trim().toLowerCase();
        if (!email) return [];
        const currentUser = await ctx.db
          .query("users")
          .withIndex("by_email", (q: any) => q.eq("email", email))
          .first();
        if (!currentUser) return [];
        const enrollment = await ctx.db
          .query("enrollments")
          .withIndex("by_section_student", (q) => q.eq("sectionId", session.sectionId).eq("studentId", currentUser._id))
          .first();
        if (!enrollment) return [];
      }
      return await ctx.db
        .query("slideshowSlides")
        .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
        .order("asc")
        .collect();
    } else if (args.assetId) {
      const teacher = await requireTeacher(ctx);
      const asset = await ctx.db.get(args.assetId);
      if (!asset || asset.teacherId !== teacher._id) throw new Error("Forbidden");
      return await ctx.db
        .query("slideshowSlides")
        .withIndex("by_asset", (q) => q.eq("assetId", args.assetId))
        .order("asc")
        .collect();
    }
    return [];
  },
});

// Drawing functionality (if needed)
export const saveDrawing = mutation({
  args: {
    sessionId: v.id("slideshowSessions"),
    slideIndex: v.number(),
    drawingData: v.string(), // JSON string of drawing data
  },
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx);
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Slideshow session not found");
    await requireTeacherOwnsSection(ctx, session.sectionId as Id<"sections">, teacher._id);
    // Placeholder response
    return "drawing_saved";
  },
});

export const getActiveSession = query({
  args: { sessionId: v.id("slideshowSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;
    // Allow owner teacher OR enrolled students to read limited details
    let isTeacherOwner = false;
    let isAuthorizedStudent = false;
    try {
      const teacher = await requireTeacher(ctx);
      await requireTeacherOwnsSection(ctx, session.sectionId as Id<"sections">, teacher._id);
      isTeacherOwner = true;
    } catch {
      // Not a teacher; verify enrolled student
      const identity = await ctx.auth.getUserIdentity();
      const email = (identity?.email ?? identity?.tokenIdentifier ?? "").toString().trim().toLowerCase();
      if (!email) return null;
      const currentUser = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", email))
        .first();
      if (!currentUser) return null;
      const enrollment = await ctx.db
        .query("enrollments")
        .withIndex("by_section_student", (q) => q.eq("sectionId", session.sectionId).eq("studentId", currentUser._id))
        .first();
      if (!enrollment) return null;
      isAuthorizedStudent = true;
    }

    // Include asset details expected by the client UI
    const asset = await ctx.db.get(session.assetId as Id<"slideshowAssets">);
    // Students receive limited fields; teachers receive full session + asset details
    if (!isTeacherOwner && isAuthorizedStudent) {
      return {
        _id: session._id,
        sectionId: session.sectionId,
        currentSlide: session.currentSlide,
        title: (asset as any)?.title,
        totalSlides: (asset as any)?.totalSlides ?? null,
      } as any;
    }
    if (!isTeacherOwner) return null;
    return {
      ...session,
      title: (asset as any)?.title,
      filePath: (asset as any)?.filePath,
      mimeType: (asset as any)?.mimeType,
      totalSlides: (asset as any)?.totalSlides ?? null,
    } as any;
  },
});

export const getDrawings = query({
  args: { sessionId: v.id("slideshowSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return [];
    // Allow owner teacher or enrolled student (currently returns empty drawings placeholder)
    try {
      const teacher = await requireTeacher(ctx);
      await requireTeacherOwnsSection(ctx, session.sectionId as Id<"sections">, teacher._id);
    } catch {
      const identity = await ctx.auth.getUserIdentity();
      const email = (identity?.email ?? identity?.tokenIdentifier ?? "").toString().trim().toLowerCase();
      if (!email) return [];
      const currentUser = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", email))
        .first();
      if (!currentUser) return [];
      const enrollment = await ctx.db
        .query("enrollments")
        .withIndex("by_section_student", (q) => q.eq("sectionId", session.sectionId).eq("studentId", currentUser._id))
        .first();
      if (!enrollment) return [];
    }
    return [] as any;
  },
});

export const closeSession = mutation({
  args: { sessionId: v.id("slideshowSessions") },
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx);
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Slideshow session not found");
    await requireTeacherOwnsSection(ctx, session.sectionId as Id<"sections">, teacher._id);
    const rl = await checkAndIncrementRateLimit(ctx, teacher._id, `ss:close:${args.sessionId}` as any, 5 * 60 * 1000, 60);
    if (!rl.allowed) throw new Error("Rate limited. Please wait a moment and try again.");
    await ctx.db.patch(args.sessionId, {
      closedAt: Date.now(),
    });
  },
});
