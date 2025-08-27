import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

// Asset management
export const createAsset = mutation({
  args: {
    teacherId: v.id("users"),
    title: v.string(),
    filePath: v.string(),
    mimeType: v.string(),
    totalSlides: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("slideshowAssets", {
      teacherId: args.teacherId,
      title: args.title,
      filePath: args.filePath,
      mimeType: args.mimeType,
      totalSlides: args.totalSlides,
      createdAt: Date.now(),
    });
  },
});

export const getAssetsByTeacher = query({
  args: { teacherId: v.id("users") },
  handler: async (ctx, args) => {
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
    return await ctx.db.insert("slideshowSessions", {
      sectionId: args.sectionId,
      assetId: args.assetId,
      currentSlide: args.currentSlide ?? 1,
      showOnDevices: args.showOnDevices ?? true,
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
    await ctx.db.patch(args.sessionId, {
      currentSlide: args.slideNumber,
    });
  },
});

export const heartbeat = mutation({
  args: { sessionId: v.id("slideshowSessions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      instructorLastSeenAt: Date.now(),
    });
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
      return await ctx.db
        .query("slideshowSlides")
        .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
        .order("asc")
        .collect();
    } else if (args.assetId) {
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
    // This would store drawing data - you might want to create a separate table for this
    // For now, we'll just return success
    return "drawing_saved";
  },
});
