import { ConvexReactClient } from "convex/react";
import { api } from "../../convex/_generated/api";

// Create a client
export const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Export the API for type safety
export { api };

// Helper functions to make the API easier to use
export const convexApi = {
  // Auth functions
  auth: {
    authenticateTeacher: (email: string, firstName?: string, lastName?: string) => 
      api.auth.authenticateTeacher({ email, firstName, lastName }),
    authenticateStudent: (email: string) => 
      api.auth.authenticateStudent({ email }),
    getUser: (id: string) => api.auth.getUser({ id: id as any }),
    getUserByEmail: (email: string) => api.auth.getUserByEmail({ email }),
  },

  // User functions
  users: {
    get: (id: string) => api.users.get({ id: id as any }),
    getByEmail: (email: string) => api.users.getByEmail({ email }),
    create: (data: { email: string; firstName: string; lastName: string; role: "TEACHER" | "STUDENT" }) => 
      api.users.create(data),
    list: (role?: "TEACHER" | "STUDENT") => api.users.list({ role }),
  },
  
  // Section functions
  sections: {
    get: (id: string) => api.sections.get({ id: id as any }),
    getByTeacher: (teacherId: string) => api.sections.getByTeacher({ teacherId: teacherId as any }),
    create: (data: { title: string; gradient?: string; teacherId: string }) => 
      api.sections.create(data),
    list: () => api.sections.list(),
  },
  
  // Attendance functions
  attendance: {
    getClassDay: (sectionId: string, date: number) => 
      api.attendance.getClassDay({ sectionId: sectionId as any, date }),
    createClassDay: (data: { sectionId: string; date: number; attendanceCode: string; attendanceCodeExpiresAt?: number }) => 
      api.attendance.createClassDay(data),
    checkIn: (attendanceCode: string, studentId: string) => 
      api.attendance.checkIn({ attendanceCode, studentId: studentId as any }),
    getAttendanceStatus: (sectionId: string) => 
      api.attendance.getAttendanceStatus({ sectionId: sectionId as any }),
    getAttendanceRecords: (classDayId: string) => 
      api.attendance.getAttendanceRecords({ classDayId: classDayId as any }),
    updateManualStatus: (data: { classDayId: string; studentId: string; status: "PRESENT" | "ABSENT" | "EXCUSED" | "NOT_JOINED" | "BLANK"; teacherId: string }) => 
      api.attendance.updateManualStatus(data),
    getManualStatusChanges: (classDayId: string) => 
      api.attendance.getManualStatusChanges({ classDayId: classDayId as any }),
    startAttendance: (sectionId: string) => 
      api.attendance.startAttendance({ sectionId: sectionId as any }),
  },
  
  // Enrollment functions
  enrollments: {
    create: (sectionId: string, studentId: string) => 
      api.enrollments.create({ sectionId: sectionId as any, studentId: studentId as any }),
    getBySection: (sectionId: string) => 
      api.enrollments.getBySection({ sectionId: sectionId as any }),
    getByStudent: (studentId: string) => 
      api.enrollments.getByStudent({ studentId: studentId as any }),
    remove: (sectionId: string, studentId: string) => 
      api.enrollments.remove({ sectionId: sectionId as any, studentId: studentId as any }),
  },
  
  // History functions
  history: {
    getSectionHistory: (sectionId: string, offset: number, limit: number) => 
      api.history.getSectionHistory({ sectionId: sectionId as any, offset, limit }),
    getStudentHistory: (studentId: string, offset: number, limit: number) => 
      api.history.getStudentHistory({ studentId: studentId as any, offset, limit }),
  },
  
  // Poll functions
  polls: {
    startPoll: (sectionId: string, prompt: string, options: string[], showResults?: boolean) => 
      api.polls.startPoll({ sectionId: sectionId as any, prompt, options, showResults }),
    getActivePoll: (sectionId: string) => 
      api.polls.getActivePoll({ sectionId: sectionId as any }),
    submitAnswer: (sessionId: string, studentId: string, optionIdx: number) => 
      api.polls.submitAnswer({ sessionId: sessionId as any, studentId: studentId as any, optionIdx }),
    getResults: (sessionId: string) => 
      api.polls.getResults({ sessionId: sessionId as any }),
    toggleResults: (sessionId: string) => 
      api.polls.toggleResults({ sessionId: sessionId as any }),
    closePoll: (sessionId: string) => 
      api.polls.closePoll({ sessionId: sessionId as any }),
    heartbeat: (sessionId: string) => 
      api.polls.heartbeat({ sessionId: sessionId as any }),
  },
  
  // WordCloud functions
  wordcloud: {
    startWordCloud: (sectionId: string, prompt: string, showPromptToStudents?: boolean, allowMultipleAnswers?: boolean) => 
      api.wordcloud.startWordCloud({ sectionId: sectionId as any, prompt, showPromptToStudents, allowMultipleAnswers }),
    getActiveWordCloud: (sectionId: string) => 
      api.wordcloud.getActiveWordCloud({ sectionId: sectionId as any }),
    submitAnswer: (sessionId: string, studentId: string, text: string) => 
      api.wordcloud.submitAnswer({ sessionId: sessionId as any, studentId: studentId as any, text }),
    getResults: (sessionId: string) => 
      api.wordcloud.getResults({ sessionId: sessionId as any }),
    closeWordCloud: (sessionId: string) => 
      api.wordcloud.closeWordCloud({ sessionId: sessionId as any }),
    heartbeat: (sessionId: string) => 
      api.wordcloud.heartbeat({ sessionId: sessionId as any }),
  },
  
  // Slideshow functions
  slideshow: {
    createAsset: (teacherId: string, title: string, filePath: string, mimeType: string, totalSlides?: number) => 
      api.slideshow.createAsset({ teacherId: teacherId as any, title, filePath, mimeType, totalSlides }),
    getAssetsByTeacher: (teacherId: string) => 
      api.slideshow.getAssetsByTeacher({ teacherId: teacherId as any }),
    startSlideshow: (sectionId: string, assetId: string, options?: any) => 
      api.slideshow.startSlideshow({ sectionId: sectionId as any, assetId: assetId as any, ...options }),
    getActiveSlideshow: (sectionId: string) => 
      api.slideshow.getActiveSlideshow({ sectionId: sectionId as any }),
    closeSlideshow: (sessionId: string) => 
      api.slideshow.closeSlideshow({ sessionId: sessionId as any }),
    gotoSlide: (sessionId: string, slideNumber: number) => 
      api.slideshow.gotoSlide({ sessionId: sessionId as any, slideNumber }),
    heartbeat: (sessionId: string) => 
      api.slideshow.heartbeat({ sessionId: sessionId as any }),
    addSlide: (options: any) => 
      api.slideshow.addSlide(options),
    getSlides: (options: any) => 
      api.slideshow.getSlides(options),
  },
};
