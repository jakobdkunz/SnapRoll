import { useQuery, useMutation } from "convex/react";
import { convex, convexApi } from "@snaproll/convex-client";

// Types for compatibility with existing API
export type AttendanceStatus = {
  hasActiveAttendance: boolean;
  totalStudents: number;
  checkedIn: number;
  progress: number;
  attendanceCode: string | null;
};

export type CheckinResponse = {
  ok: boolean;
  record?: any;
  status?: string;
  section?: { id: string; title: string };
  error?: string;
};

export type HistoryResponse = {
  students: { id: string; firstName: string; lastName: string; email: string }[];
  days: { id: string; date: string; attendanceCode: string }[];
  records: Array<{ studentId: string; records: any[] }>;
  totalDays: number;
  offset: number;
  limit: number;
};

// Convex-based API client
export class ConvexApiClient {
  // Auth functions
  static async authenticateTeacher(email: string, firstName?: string, lastName?: string): Promise<any> {
    return await convex.mutation(convexApi.auth.authenticateTeacher(email, firstName, lastName));
  }

  static async authenticateStudent(email: string): Promise<any> {
    return await convex.mutation(convexApi.auth.authenticateStudent(email));
  }

  static async getUser(userId: string): Promise<any> {
    return await convex.query(convexApi.auth.getUser(userId));
  }

  static async getUserByEmail(email: string): Promise<any> {
    return await convex.query(convexApi.auth.getUserByEmail(email));
  }

  // Attendance functions
  static async checkIn(code: string, studentId: string): Promise<CheckinResponse> {
    try {
      const recordId = await convex.mutation(convexApi.attendance.checkIn(code, studentId));
      return { ok: true, record: { id: recordId }, status: "PRESENT" };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }

  static async getAttendanceStatus(sectionId: string): Promise<AttendanceStatus> {
    return await convex.query(convexApi.attendance.getAttendanceStatus(sectionId));
  }

  static async startAttendance(sectionId: string): Promise<any> {
    return await convex.mutation(convexApi.attendance.startAttendance(sectionId));
  }

  static async updateManualStatus(data: {
    classDayId: string;
    studentId: string;
    status: "PRESENT" | "ABSENT" | "EXCUSED" | "NOT_JOINED" | "BLANK";
    teacherId: string;
  }): Promise<any> {
    return await convex.mutation(convexApi.attendance.updateManualStatus(data));
  }

  // History functions
  static async getSectionHistory(sectionId: string, offset: number, limit: number): Promise<HistoryResponse> {
    return await convex.query(convexApi.history.getSectionHistory(sectionId, offset, limit));
  }

  static async getStudentHistory(studentId: string, offset: number, limit: number): Promise<any> {
    return await convex.query(convexApi.history.getStudentHistory(studentId, offset, limit));
  }

  // Section functions
  static async getSection(sectionId: string): Promise<any> {
    return await convex.query(convexApi.sections.get(sectionId));
  }

  static async getSectionsByTeacher(teacherId: string): Promise<any[]> {
    return await convex.query(convexApi.sections.getByTeacher(teacherId));
  }

  // User functions
  static async getUser(userId: string): Promise<any> {
    return await convex.query(convexApi.users.get(userId));
  }

  static async getUserByEmail(email: string): Promise<any> {
    return await convex.query(convexApi.users.getByEmail(email));
  }

  // Enrollment functions
  static async createEnrollment(sectionId: string, studentId: string): Promise<any> {
    return await convex.mutation(convexApi.enrollments.create(sectionId, studentId));
  }

  static async getEnrollmentsBySection(sectionId: string): Promise<any[]> {
    return await convex.query(convexApi.enrollments.getBySection(sectionId));
  }
}

// React hooks for Convex
export const useConvexQuery = useQuery;
export const useConvexMutation = useMutation;

// Specific hooks for attendance
export const useAttendanceStatus = (sectionId: string) => {
  return useQuery(convexApi.attendance.getAttendanceStatus(sectionId));
};

export const useSectionHistory = (sectionId: string, offset: number, limit: number) => {
  return useQuery(convexApi.history.getSectionHistory(sectionId, offset, limit));
};

export const useStudentHistory = (studentId: string, offset: number, limit: number) => {
  return useQuery(convexApi.history.getStudentHistory(studentId, offset, limit));
};

// Mutations
export const useCheckIn = () => {
  return useMutation(convexApi.attendance.checkIn);
};

export const useStartAttendance = () => {
  return useMutation(convexApi.attendance.startAttendance);
};

export const useUpdateManualStatus = () => {
  return useMutation(convexApi.attendance.updateManualStatus);
};

// Auth mutations
export const useAuthenticateTeacher = () => {
  return useMutation(convexApi.auth.authenticateTeacher);
};

export const useAuthenticateStudent = () => {
  return useMutation(convexApi.auth.authenticateStudent);
};
