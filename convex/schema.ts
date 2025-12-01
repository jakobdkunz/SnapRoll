import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    role: v.union(v.literal("TEACHER"), v.literal("STUDENT")),
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"]),

  sections: defineTable({
    title: v.string(),
    gradient: v.optional(v.string()),
    teacherId: v.id("users"),
    joinCode: v.optional(v.string()),
    // Optional permitted elective absences for the section
    permittedAbsences: v.optional(v.number()),
    // How permittedAbsences was configured
    permittedAbsencesMode: v.optional(v.union(v.literal("policy"), v.literal("custom"))),
    // If policy mode, capture the policy parameters used
    policyTimesPerWeek: v.optional(v.number()),
    policyDuration: v.optional(v.union(v.literal("semester"), v.literal("8week"))),
    // Participation configuration
    participationCountsAttendance: v.optional(v.boolean()),
    // Back-compat: keep this optional field to allow deployment with existing data; not used anymore
    attendanceCheckinPoints: v.optional(v.number()),
    participationCreditPointsPossible: v.optional(v.number()),
  })
    .index("by_teacher", ["teacherId"])
    .index("by_title", ["title"]) 
    .index("by_joinCode", ["joinCode"]),

  enrollments: defineTable({
    sectionId: v.id("sections"),
    studentId: v.id("users"),
    createdAt: v.number(), // Unix timestamp
    removedAt: v.optional(v.number()), // when unenrolled; kept for history
  })
    .index("by_section", ["sectionId"])
    .index("by_student", ["studentId"])
    .index("by_section_student", ["sectionId", "studentId"]),

  classDays: defineTable({
    sectionId: v.id("sections"),
    date: v.number(), // Unix timestamp
    attendanceCode: v.string(),
    attendanceCodeExpiresAt: v.optional(v.number()),
    hasActivity: v.optional(v.boolean()),
  })
    .index("by_section", ["sectionId"])
    .index("by_section_date", ["sectionId", "date"])
    .index("by_attendance_code", ["attendanceCode"])
    // Helpful for filtering active days per section if needed in the future
    .index("by_section_active", ["sectionId", "hasActivity"]),

  attendanceRecords: defineTable({
    classDayId: v.id("classDays"),
    studentId: v.id("users"),
    status: v.union(
      v.literal("PRESENT"),
      v.literal("ABSENT"),
      v.literal("EXCUSED"),
      v.literal("NOT_JOINED"),
      v.literal("BLANK")
    ),
  })
    .index("by_classDay", ["classDayId"])
    .index("by_student", ["studentId"])
    .index("by_classDay_student", ["classDayId", "studentId"]),

  manualStatusChanges: defineTable({
    classDayId: v.id("classDays"),
    studentId: v.id("users"),
    teacherId: v.id("users"),
    status: v.union(
      v.literal("PRESENT"),
      v.literal("ABSENT"),
      v.literal("EXCUSED"),
      v.literal("NOT_JOINED"),
      v.literal("BLANK")
    ),
    createdAt: v.number(),
  })
    .index("by_classDay", ["classDayId"])
    .index("by_student", ["studentId"])
    .index("by_teacher", ["teacherId"])
    .index("by_classDay_student", ["classDayId", "studentId"]),

  wordCloudSessions: defineTable({
    sectionId: v.id("sections"),
    prompt: v.string(),
    showPromptToStudents: v.boolean(),
    allowMultipleAnswers: v.boolean(),
    createdAt: v.number(),
    closedAt: v.optional(v.number()),
    instructorLastSeenAt: v.optional(v.number()),
    // Legacy field from earlier participation design; kept optional for back-compat
    points: v.optional(v.number()),
    // Whether this session should count toward Participation Credit
    // Back-compat: make optional so older sessions without this field remain valid
    countsForParticipation: v.optional(v.boolean()),
  })
    .index("by_section", ["sectionId"])
    .index("by_section_active", ["sectionId", "closedAt"]),

  wordCloudAnswers: defineTable({
    sessionId: v.id("wordCloudSessions"),
    studentId: v.id("users"),
    text: v.string(),
    createdAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_student", ["studentId"])
    .index("by_session_student", ["sessionId", "studentId"])
    .index("by_session_student_text", ["sessionId", "studentId", "text"]),

  pollSessions: defineTable({
    sectionId: v.id("sections"),
    prompt: v.string(),
    optionsJson: v.string(), // JSON string of options array
    showResults: v.boolean(),
    createdAt: v.number(),
    closedAt: v.optional(v.number()),
    instructorLastSeenAt: v.optional(v.number()),
    // Legacy field from earlier participation design; kept optional for back-compat
    points: v.optional(v.number()),
    // Whether this session should count toward Participation Credit
    // Back-compat: make optional so older sessions without this field remain valid
    countsForParticipation: v.optional(v.boolean()),
  })
    .index("by_section", ["sectionId"])
    .index("by_section_active", ["sectionId", "closedAt"]),

  pollAnswers: defineTable({
    sessionId: v.id("pollSessions"),
    studentId: v.id("users"),
    optionIdx: v.number(),
    createdAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_student", ["studentId"])
    .index("by_session_student", ["sessionId", "studentId"]),

  slideshowAssets: defineTable({
    teacherId: v.id("users"),
    title: v.string(),
    filePath: v.string(),
    mimeType: v.string(),
    totalSlides: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_teacher", ["teacherId"]),

  slideshowSessions: defineTable({
    sectionId: v.id("sections"),
    assetId: v.id("slideshowAssets"),
    currentSlide: v.number(),
    showOnDevices: v.boolean(),
    allowDownload: v.boolean(),
    requireStay: v.boolean(),
    preventJump: v.boolean(),
    officeMode: v.boolean(),
    createdAt: v.number(),
    closedAt: v.optional(v.number()),
    instructorLastSeenAt: v.optional(v.number()),
  })
    .index("by_section", ["sectionId"])
    .index("by_asset", ["assetId"])
    .index("by_section_active", ["sectionId", "closedAt"]),

  slideshowSlides: defineTable({
    sessionId: v.optional(v.id("slideshowSessions")),
    assetId: v.optional(v.id("slideshowAssets")),
    index: v.number(),
    imageUrl: v.string(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_asset", ["assetId"])
    .index("by_session_index", ["sessionId", "index"])
    .index("by_asset_index", ["assetId", "index"]),

  // Simple rate limiter buckets per user + key
  rateLimits: defineTable({
    userId: v.id("users"),
    key: v.string(),
    windowStart: v.number(),
    count: v.number(),
    blockedUntil: v.optional(v.number()),
  })
    .index("by_user_key", ["userId", "key"]) ,

  // Bible passage live activity sessions
  biblePassageSessions: defineTable({
    sectionId: v.id("sections"),
    reference: v.string(), // e.g., "John 3:16-18"
    translationId: v.string(), // e.g., "web", "kjv"
    translationName: v.string(), // Human-readable translation name
    text: v.string(), // Full passage text as returned by the API
    // Optional serialized verses array from the Bible API, used for rich formatting
    versesJson: v.optional(v.string()),
    createdAt: v.number(),
    closedAt: v.optional(v.number()),
    instructorLastSeenAt: v.optional(v.number()),
  })
    .index("by_section", ["sectionId"])
    .index("by_section_active", ["sectionId", "closedAt"]),

  // Gamification: Points opportunities (attendance day, poll session, word cloud session)
  pointsOpportunities: defineTable({
    sectionId: v.id("sections"),
    // 'attendance' | 'poll' | 'wordcloud'
    kind: v.union(v.literal("attendance"), v.literal("poll"), v.literal("wordcloud")),
    // Store the target entity id as string to avoid schema unions
    targetId: v.string(),
    // Optional source date in ms, when applicable (e.g., class day date)
    sourceDate: v.optional(v.number()),
    points: v.number(),
    createdAt: v.number(),
    undone: v.boolean(),
  })
    .index("by_section", ["sectionId"]) 
    .index("by_kind_target", ["kind", "targetId"]) 
    .index("by_section_createdAt", ["sectionId", "createdAt"]),

  // Gamification: Individual student awards for a given opportunity
  pointsAssignments: defineTable({
    opportunityId: v.id("pointsOpportunities"),
    sectionId: v.id("sections"),
    studentId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_opportunity", ["opportunityId"]) 
    .index("by_section_student", ["sectionId", "studentId"]) 
    .index("by_student", ["studentId"]),
});
