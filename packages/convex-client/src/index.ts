import { ConvexReactClient, ConvexProvider } from "convex/react";
import { api } from "../../../convex/_generated/api";

// Export the API and Provider
export { api, ConvexProvider };

// Factory to create a Convex client. Do not instantiate at import-time.
export function createConvexClient(url: string): ConvexReactClient {
  return new ConvexReactClient(url);
}

// Helper to read the Convex URL from env with a clear error if missing.
export function getConvexUrl(): string {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_CONVEX_URL is not set. Configure it in your environment (e.g., Vercel Project Settings)."
    );
  }
  return url;
}

// Helper functions to make the API easier to use
export const convexApi = {
  // Auth functions
  auth: {
    authenticateTeacher: api.functions.auth.authenticateTeacher,
    authenticateStudent: api.functions.auth.authenticateStudent,
    getUser: api.functions.auth.getUser,
    getUserByEmail: api.functions.auth.getUserByEmail,
    // Note: getCurrentUser is available at runtime; types may require regeneration
    getCurrentUser: (api as any).functions.auth.getCurrentUser,
    upsertCurrentUser: api.functions.auth.upsertCurrentUser,
  },

  // User functions
  users: {
    get: api.functions.users.get,
    getByEmail: api.functions.users.getByEmail,
    create: api.functions.users.create,
    update: api.functions.users.update,
    list: api.functions.users.list,
  },
  
  // Section functions
  sections: {
    get: api.functions.sections.get,
    getByTeacher: api.functions.sections.getByTeacher,
    create: api.functions.sections.create,
    update: api.functions.sections.update,
    deleteSection: api.functions.sections.deleteSection,
    list: api.functions.sections.list,
  },
  
  // Attendance functions
  attendance: {
    getClassDay: api.functions.attendance.getClassDay,
    createClassDay: api.functions.attendance.createClassDay,
    checkIn: api.functions.attendance.checkIn,
    getAttendanceStatus: api.functions.attendance.getAttendanceStatus,
    getAttendanceRecords: api.functions.attendance.getAttendanceRecords,
    updateManualStatus: api.functions.attendance.updateManualStatus,
    getManualStatusChanges: api.functions.attendance.getManualStatusChanges,
    startAttendance: api.functions.attendance.startAttendance,
  },
  
  // Enrollment functions
  enrollments: {
    create: api.functions.enrollments.create,
    getBySection: api.functions.enrollments.getBySection,
    getByStudent: api.functions.enrollments.getByStudent,
    remove: api.functions.enrollments.remove,
  },
  
  // History functions
  history: {
    getSectionHistory: api.functions.history.getSectionHistory,
    getStudentHistory: api.functions.history.getStudentHistory,
    exportSectionHistory: (api as any).functions.history.exportSectionHistory,
  },
  
  // Poll functions
  polls: {
    startPoll: api.functions.polls.startPoll,
    getActivePoll: api.functions.polls.getActivePoll,
    submitAnswer: api.functions.polls.submitAnswer,
    getResults: api.functions.polls.getResults,
    toggleResults: api.functions.polls.toggleResults,
    closePoll: api.functions.polls.closePoll,
    heartbeat: api.functions.polls.heartbeat,
  },
  
  // WordCloud functions
  wordcloud: {
    startWordCloud: api.functions.wordcloud.startWordCloud,
    getActiveWordCloud: api.functions.wordcloud.getActiveWordCloud,
    submitAnswer: api.functions.wordcloud.submitAnswer,
    getResults: api.functions.wordcloud.getResults,
    closeWordCloud: api.functions.wordcloud.closeWordCloud,
    heartbeat: api.functions.wordcloud.heartbeat,
  },
  
  // Slideshow functions
  slideshow: {
    createAsset: api.functions.slideshow.createAsset,
    getAssetsByTeacher: api.functions.slideshow.getAssetsByTeacher,
    startSlideshow: api.functions.slideshow.startSlideshow,
    getActiveSlideshow: api.functions.slideshow.getActiveSlideshow,
    closeSlideshow: api.functions.slideshow.closeSlideshow,
    gotoSlide: api.functions.slideshow.gotoSlide,
    heartbeat: api.functions.slideshow.heartbeat,
    addSlide: api.functions.slideshow.addSlide,
    getSlides: api.functions.slideshow.getSlides,
  },

  // Students functions
  students: {
    getActiveInteractive: api.functions.students.getActiveInteractive,
  },
  
  // Demo utilities (developer mode only)
  demo: {
    generateDemoData: (api as any).functions.demo.generateDemoData,
  },
};
