import { ConvexReactClient } from "convex/react";
import { api } from "../../convex/_generated/api";

// Create a client
export const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Export the API for type safety
export { api };

// Helper functions to make the API easier to use
export const convexApi = {
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
};
