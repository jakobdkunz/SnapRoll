// @ts-nocheck

import { v } from "convex/values";
import { mutation, query, internalMutation, action } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { requireTeacher, requireTeacherOwnsSection, requireStudentEnrollment } from "./_auth";
import { checkAndIncrementRateLimit } from "./_rateLimit";
import { api } from "../_generated/api";

// Trusted public Bible API endpoint (World English Bible by default, with optional translation param)
const BIBLE_API_BASE = "https://bible-api.com";

// Limited set of translations we expose in the UI.
// These correspond to identifiers supported by bible-api.com.
export const SUPPORTED_TRANSLATIONS = [
  { id: "web", name: "World English Bible (WEB)" },
  { id: "webbe", name: "World English Bible, British Edition (WEBBE)" },
  { id: "oeb-us", name: "Open English Bible (US)" },
  { id: "oeb-cw", name: "Open English Bible (Commonwealth)" },
  { id: "kjv", name: "King James Version (KJV)" },
  { id: "asv", name: "American Standard Version (ASV)" },
  { id: "bbe", name: "Bible in Basic English (BBE)" },
  { id: "darby", name: "Darby Bible" },
  { id: "dra", name: "Douay-Rheims 1899 American Edition" },
  { id: "ylt", name: "Young's Literal Translation (NT only)" },
] as const;

function resolveTranslation(id: string | undefined | null) {
  const fallback = SUPPORTED_TRANSLATIONS[0];
  if (!id) return fallback;
  const lower = id.toLowerCase();
  return SUPPORTED_TRANSLATIONS.find((t) => t.id === lower) ?? fallback;
}

async function fetchBiblePassage(
  reference: string,
  translationId: string
): Promise<{ text: string; versesJson: string | null }> {
  const ref = reference.trim();
  if (!ref) throw new Error("Reference is required");
  if (ref.length > 80) throw new Error("Reference is too long");

  const url = new URL(`${BIBLE_API_BASE}/${encodeURIComponent(ref)}`);
  if (translationId && translationId !== "web") {
    url.searchParams.set("translation", translationId);
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error("Unable to fetch passage. Please check the reference and try again.");
  }

  const json = (await res.json()) as {
    text?: string;
    verses?: Array<{ verse?: number; text?: string }>;
  };

  let text = "";
  if (typeof json.text === "string" && json.text.trim().length > 0) {
    text = json.text.trim();
  } else if (Array.isArray(json.verses) && json.verses.length > 0) {
    const combined = json.verses
      .map((v) => (v.text ?? "").toString().trim())
      .filter(Boolean)
      .join(" ");
    if (combined.length > 0) text = combined;
  }

  if (!text) {
    throw new Error("No text returned for that passage. Try a different reference.");
  }

  const versesJson = Array.isArray(json.verses) && json.verses.length > 0 ? JSON.stringify(json.verses) : null;
  return { text, versesJson };
}

// Internal core mutation: validates teacher & section, rate limits, and writes session.
export const _startBibleSessionCore = internalMutation({
  args: {
    sectionId: v.id("sections"),
    reference: v.string(),
    translationId: v.string(),
    translationName: v.string(),
    text: v.string(),
    versesJson: v.optional(v.string()),
    demoUserEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx, args.demoUserEmail);
    await requireTeacherOwnsSection(ctx, args.sectionId as Id<"sections">, teacher._id);

    // Rate limit: 30 operations / 10 minutes per teacher per section
    const rl = await checkAndIncrementRateLimit(
      ctx,
      teacher._id,
      `bible:start:${args.sectionId}` as any,
      10 * 60 * 1000,
      30
    );
    if (!rl.allowed) throw new Error("Rate limited. Please wait a moment and try again.");

    // If an active Bible passage session exists for this section, close it first
    const existing = await ctx.db
      .query("biblePassageSessions")
      .withIndex("by_section_active", (q) =>
        q.eq("sectionId", args.sectionId).eq("closedAt", undefined)
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { closedAt: Date.now() });
    }

    const sessionId = await ctx.db.insert("biblePassageSessions", {
      sectionId: args.sectionId,
      reference: args.reference,
      translationId: args.translationId,
      translationName: args.translationName,
      text: args.text,
      versesJson: args.versesJson,
      createdAt: Date.now(),
      closedAt: undefined,
      instructorLastSeenAt: undefined,
    });
    return sessionId;
  },
});

// Public entrypoint: action so we can call the external Bible API via ctx.fetch.
export const startBiblePassage = action({
  args: {
    sectionId: v.id("sections"),
    bookAndRange: v.string(), // e.g. "John 3:16-18"
    translationId: v.optional(v.string()),
    demoUserEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    "use node";
    const reference = (args.bookAndRange || "").trim();
    if (reference.length === 0 || reference.length > 80) {
      throw new Error("Reference must be 1–80 characters.");
    }

    const { id: translationId, name: translationName } = resolveTranslation(
      args.translationId ?? undefined
    );

    // Fetch passage text from public API
    let text: string;
    let versesJson: string | null;
    try {
      const rich = await fetchBiblePassage(reference, translationId);
      text = rich.text;
      versesJson = rich.versesJson;
    } catch (e) {
      const msg =
        e instanceof Error && e.message
          ? e.message
          : "Unable to fetch passage from the Bible API. Please try again.";
      throw new Error(msg);
    }

    const sessionId = await ctx.runMutation(api.functions.bible._startBibleSessionCore, {
      sectionId: args.sectionId,
      reference,
      translationId,
      translationName,
      text,
      versesJson,
      demoUserEmail: args.demoUserEmail,
    });

    return sessionId;
  },
});

// Internal core mutation to update an existing Bible passage session in-place.
export const _updateBibleSessionCore = internalMutation({
  args: {
    sessionId: v.id("biblePassageSessions"),
    reference: v.string(),
    translationId: v.string(),
    translationName: v.string(),
    text: v.string(),
    versesJson: v.optional(v.string()),
    demoUserEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx, args.demoUserEmail);
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Bible passage session not found");
    await requireTeacherOwnsSection(ctx, session.sectionId as Id<"sections">, teacher._id);
    await ctx.db.patch(args.sessionId, {
      reference: args.reference,
      translationId: args.translationId,
      translationName: args.translationName,
      text: args.text,
      versesJson: args.versesJson,
      instructorLastSeenAt: Date.now(),
    });
    return args.sessionId;
  },
});

// Public action to update the passage for an existing session without restarting it.
export const updateBiblePassage = action({
  args: {
    sessionId: v.id("biblePassageSessions"),
    bookAndRange: v.string(),
    translationId: v.optional(v.string()),
    demoUserEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    "use node";
    const reference = (args.bookAndRange || "").trim();
    if (reference.length === 0 || reference.length > 80) {
      throw new Error("Reference must be 1–80 characters.");
    }

    const { id: translationId, name: translationName } = resolveTranslation(
      args.translationId ?? undefined
    );

    let text: string;
    let versesJson: string | null;
    try {
      const rich = await fetchBiblePassage(reference, translationId);
      text = rich.text;
      versesJson = rich.versesJson;
    } catch (e) {
      const msg =
        e instanceof Error && e.message
          ? e.message
          : "Unable to fetch passage from the Bible API. Please try again.";
      throw new Error(msg);
    }

    const sessionId = await ctx.runMutation(api.functions.bible._updateBibleSessionCore, {
      sessionId: args.sessionId,
      reference,
      translationId,
      translationName,
      text,
      versesJson,
      demoUserEmail: args.demoUserEmail,
    });

    return sessionId;
  },
});

export const getActiveBiblePassage = query({
  args: { sectionId: v.id("sections"), demoUserEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // Allow teachers who own the section or enrolled students to see the active passage
    try {
      const teacher = await requireTeacher(ctx, args.demoUserEmail);
      await requireTeacherOwnsSection(ctx, args.sectionId as Id<"sections">, teacher._id);
    } catch {
      await requireStudentEnrollment(ctx, args.sectionId as Id<"sections">, args.demoUserEmail);
    }

    const session = await ctx.db
      .query("biblePassageSessions")
      .withIndex("by_section_active", (q) =>
        q.eq("sectionId", args.sectionId).eq("closedAt", undefined)
      )
      .first();

    return session ?? null;
  },
});

export const getBibleSession = query({
  args: { sessionId: v.id("biblePassageSessions"), demoUserEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;

    // Allow owner teacher or enrolled students
    try {
      const teacher = await requireTeacher(ctx, args.demoUserEmail);
      await requireTeacherOwnsSection(ctx, session.sectionId as Id<"sections">, teacher._id);
      return session;
    } catch {
      await requireStudentEnrollment(ctx, session.sectionId as Id<"sections">, args.demoUserEmail);
      return session;
    }
  },
});

export const closeBiblePassage = mutation({
  args: { sessionId: v.id("biblePassageSessions"), demoUserEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx, args.demoUserEmail);
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Bible passage session not found");
    await requireTeacherOwnsSection(ctx, session.sectionId as Id<"sections">, teacher._id);

    const rl = await checkAndIncrementRateLimit(
      ctx,
      teacher._id,
      `bible:close:${args.sessionId}` as any,
      5 * 60 * 1000,
      60
    );
    if (!rl.allowed) throw new Error("Rate limited. Please wait a moment and try again.");

    await ctx.db.patch(args.sessionId, { closedAt: Date.now() });
  },
});

export const heartbeat = mutation({
  args: { sessionId: v.id("biblePassageSessions"), demoUserEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx, args.demoUserEmail);
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Bible passage session not found");
    await requireTeacherOwnsSection(ctx, session.sectionId as Id<"sections">, teacher._id);
    const now = Date.now();
    const last = (session.instructorLastSeenAt as number | undefined) ?? 0;
    if (now - last > 5000) {
      await ctx.db.patch(args.sessionId, { instructorLastSeenAt: now });
    }
  },
});

