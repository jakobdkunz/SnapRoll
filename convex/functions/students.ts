import { v } from "convex/values";
import { query } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { requireStudentEnrollment, requireTeacher, requireTeacherOwnsSection } from "./_auth";

export const getActiveInteractive = query({
  args: { studentId: v.id("users") },
  handler: async (ctx, args) => {
    // Only allow the student themselves to query their active interactive
    const identity = await ctx.auth.getUserIdentity();
    const email = (identity?.email ?? identity?.tokenIdentifier ?? "").toString().trim().toLowerCase();
    if (!email) throw new Error("Unauthenticated");
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q: any) => q.eq("email", email))
      .first();
    if (!currentUser || currentUser._id !== args.studentId) throw new Error("Forbidden");

    // Get student's enrollments
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .collect();

    const sectionIds = enrollments.map(e => e.sectionId);

    // Check for active wordcloud sessions
    const activeWordCloud = await ctx.db
      .query("wordCloudSessions")
      .filter((q) => 
        q.and(
          q.eq(q.field("closedAt"), undefined),
          q.or(...sectionIds.map(id => q.eq(q.field("sectionId"), id)))
        )
      )
      .first();

    if (activeWordCloud) {
      return {
        kind: 'wordcloud' as const,
        sessionId: activeWordCloud._id,
        prompt: activeWordCloud.prompt,
        showPromptToStudents: activeWordCloud.showPromptToStudents,
        allowMultipleAnswers: activeWordCloud.allowMultipleAnswers,
        sectionId: activeWordCloud.sectionId,
      };
    }

    // Check for active poll sessions
    const activePoll = await ctx.db
      .query("pollSessions")
      .filter((q) => 
        q.and(
          q.eq(q.field("closedAt"), undefined),
          q.or(...sectionIds.map(id => q.eq(q.field("sectionId"), id)))
        )
      )
      .first();

    if (activePoll) {
      return {
        kind: 'poll' as const,
        sessionId: activePoll._id,
        prompt: activePoll.prompt,
        options: JSON.parse(activePoll.optionsJson),
        showResults: activePoll.showResults,
        sectionId: activePoll.sectionId,
      };
    }

    // Check for active slideshow sessions
    const activeSlideshow = await ctx.db
      .query("slideshowSessions")
      .filter((q) => 
        q.and(
          q.eq(q.field("closedAt"), undefined),
          q.or(...sectionIds.map(id => q.eq(q.field("sectionId"), id)))
        )
      )
      .first();

    if (activeSlideshow) {
      return {
        kind: 'slideshow' as const,
        sessionId: activeSlideshow._id,
        currentSlide: activeSlideshow.currentSlide,
        showOnDevices: activeSlideshow.showOnDevices,
        sectionId: activeSlideshow.sectionId,
      };
    }

    return null;
  },
});
