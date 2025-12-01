import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { requireTeacher, requireTeacherOwnsSection, requireStudentEnrollment } from "./_auth";
import { checkAndIncrementRateLimit } from "./_rateLimit";

// Trusted public Bible API endpoint (World English Bible by default, with optional translation param)
const BIBLE_API_BASE = "https://bible-api.com";

// Limited set of translations we expose in the UI.
// These correspond to identifiers supported by bible-api.com.
export const SUPPORTED_TRANSLATIONS = [
  { id: "web", name: "World English Bible (WEB)" },
  { id: "kjv", name: "King James Version (KJV)" },
  { id: "asv", name: "American Standard Version (ASV)" },
] as const;

function resolveTranslation(id: string | undefined | null) {
  const fallback = SUPPORTED_TRANSLATIONS[0];
  if (!id) return fallback;
  const lower = id.toLowerCase();
  return SUPPORTED_TRANSLATIONS.find((t) => t.id === lower) ?? fallback;
}

async function fetchBiblePassage(reference: string, translationId: string): Promise<string> {
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
    verses?: Array<{ text?: string }>;
  };

  if (typeof json.text === "string" && json.text.trim().length > 0) {
    return json.text.trim();
  }

  if (Array.isArray(json.verses) && json.verses.length > 0) {
    const combined = json.verses
      .map((v) => (v.text ?? "").toString().trim())
      .filter(Boolean)
      .join(" ");
    if (combined.length > 0) return combined;
  }

  throw new Error("No text returned for that passage. Try a different reference.");
}

export const startBiblePassage = mutation({
  args: {
    sectionId: v.id("sections"),
    bookAndRange: v.string(), // e.g. "John 3:16-18"
    translationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx);
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

    const reference = (args.bookAndRange || "").trim();
    if (reference.length === 0 || reference.length > 80) {
      throw new Error("Reference must be 1–80 characters.");
    }

    const { id: translationId, name: translationName } = resolveTranslation(
      args.translationId ?? undefined
    );

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

    // Fetch passage text from public API
    const text = await fetchBiblePassage(reference, translationId);

    const sessionId = await ctx.db.insert("biblePassageSessions", {
      sectionId: args.sectionId,
      reference,
      translationId,
      translationName,
      text,
      createdAt: Date.now(),
      closedAt: undefined,
      instructorLastSeenAt: undefined,
    });

    return sessionId;
  },
});

export const getActiveBiblePassage = query({
  args: { sectionId: v.id("sections") },
  handler: async (ctx, args) => {
    // Allow teachers who own the section or enrolled students to see the active passage
    try {
      const teacher = await requireTeacher(ctx);
      await requireTeacherOwnsSection(ctx, args.sectionId as Id<"sections">, teacher._id);
    } catch {
      await requireStudentEnrollment(ctx, args.sectionId as Id<"sections">);
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
  args: { sessionId: v.id("biblePassageSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;

    // Allow owner teacher or enrolled students
    try {
      const teacher = await requireTeacher(ctx);
      await requireTeacherOwnsSection(ctx, session.sectionId as Id<"sections">, teacher._id);
      return session;
    } catch {
      await requireStudentEnrollment(ctx, session.sectionId as Id<"sections">);
      return session;
    }
  },
});

export const closeBiblePassage = mutation({
  args: { sessionId: v.id("biblePassageSessions") },
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx);
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
  args: { sessionId: v.id("biblePassageSessions") },
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx);
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


