import { v } from "convex/values";
import { query } from "../_generated/server";

export const getSectionHistory = query({
  args: {
    sectionId: v.id("sections"),
    offset: v.number(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    // Get all class days for this section, ordered by date desc
    const allClassDays = await ctx.db
      .query("classDays")
      .withIndex("by_section", (q) => q.eq("sectionId", args.sectionId))
      .order("desc")
      .collect();
    
    // Apply pagination
    const totalDays = allClassDays.length;
    const page = allClassDays.slice(args.offset, args.offset + args.limit);
    const classDayIds = page.map(cd => cd._id);
    
    // Get all students enrolled in this section
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_section", (q) => q.eq("sectionId", args.sectionId))
      .collect();
    
    const studentIds = enrollments.map(e => e.studentId);
    const students = await Promise.all(
      studentIds.map(id => ctx.db.get(id))
    );
    
    // Get attendance records for the paginated class days
    const attendanceRecords = await ctx.db
      .query("attendanceRecords")
      .filter((q) => q.or(...classDayIds.map(id => q.eq(q.field("classDayId"), id))))
      .collect();
    
    // Get manual status changes for the paginated class days
    const manualChanges = await ctx.db
      .query("manualStatusChanges")
      .filter((q) => q.or(...classDayIds.map(id => q.eq(q.field("classDayId"), id))))
      .collect();
    
    // Create lookup maps
    const attendanceMap = new Map();
    attendanceRecords.forEach(ar => {
      attendanceMap.set(`${ar.classDayId}-${ar.studentId}`, ar);
    });
    
    const manualChangeMap = new Map();
    manualChanges.forEach(mc => {
      manualChangeMap.set(`${mc.classDayId}-${mc.studentId}`, mc);
    });
    
    // Build student records
    const studentRecords = students.map(student => {
      if (!student) return null;
      
      const records = page.map(classDay => {
        const attendanceRecord = attendanceMap.get(`${classDay._id}-${student._id}`);
        const manualChange = manualChangeMap.get(`${classDay._id}-${student._id}`);
        
        const originalStatus = attendanceRecord?.status || "BLANK";
        const isManual = !!manualChange;
        const effectiveStatus = manualChange ? manualChange.status : originalStatus;
        
        return {
          classDayId: classDay._id,
          studentId: student._id,
          status: effectiveStatus,
          isManual,
          originalStatus,
          manualChange: manualChange ? {
            status: manualChange.status,
            teacherName: "Teacher", // We'll need to join with teacher data
            createdAt: manualChange.createdAt,
          } : undefined,
        };
      });
      
      return {
        studentId: student._id,
        records,
      };
    }).filter(Boolean);
    
    return {
      students: students.filter(Boolean).map(s => ({
        id: s!._id,
        firstName: s!.firstName,
        lastName: s!.lastName,
        email: s!.email,
      })),
      days: page.map(cd => ({
        id: cd._id,
        date: new Date(cd.date).toISOString().split('T')[0],
        attendanceCode: cd.attendanceCode,
      })),
      records: studentRecords,
      totalDays,
      offset: args.offset,
      limit: args.limit,
    };
  },
});

export const getStudentHistory = query({
  args: {
    studentId: v.id("users"),
    offset: v.number(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    // Get all sections the student is enrolled in
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .collect();
    
    const sectionIds = enrollments.map(e => e.sectionId);
    const sections = await Promise.all(
      sectionIds.map(id => ctx.db.get(id))
    );
    
    // Get all class days across these sections
    const allClassDays = await ctx.db
      .query("classDays")
      .filter((q) => q.or(...sectionIds.map(id => q.eq(q.field("sectionId"), id))))
      .order("desc")
      .collect();
    
    // Apply pagination
    const totalDays = allClassDays.length;
    const page = allClassDays.slice(args.offset, args.offset + args.limit);
    const classDayIds = page.map(cd => cd._id);
    
    // Get attendance records for this student
    const attendanceRecords = await ctx.db
      .query("attendanceRecords")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .filter((q) => q.or(...classDayIds.map(id => q.eq(q.field("classDayId"), id))))
      .collect();
    
    // Get manual status changes for this student
    const manualChanges = await ctx.db
      .query("manualStatusChanges")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .filter((q) => q.or(...classDayIds.map(id => q.eq(q.field("classDayId"), id))))
      .collect();
    
    // Create lookup maps
    const attendanceMap = new Map();
    attendanceRecords.forEach(ar => {
      attendanceMap.set(ar.classDayId, ar);
    });
    
    const manualChangeMap = new Map();
    manualChanges.forEach(mc => {
      manualChangeMap.set(mc.classDayId, mc);
    });
    
    // Build records by section
    const records = sections.map(section => {
      if (!section) return null;
      
      const byDate: Record<string, any> = {};
      
      page.forEach(classDay => {
        if (classDay.sectionId !== section._id) return;
        
        const dateKey = new Date(classDay.date).toISOString().split('T')[0];
        const attendanceRecord = attendanceMap.get(classDay._id);
        const manualChange = manualChangeMap.get(classDay._id);
        
        const originalStatus = attendanceRecord?.status || "BLANK";
        const isManual = !!manualChange;
        const effectiveStatus = manualChange ? manualChange.status : originalStatus;
        
        byDate[dateKey] = {
          status: effectiveStatus,
          originalStatus,
          isManual,
          manualChange: manualChange ? {
            status: manualChange.status,
            teacherName: "Teacher", // We'll need to join with teacher data
            createdAt: manualChange.createdAt,
          } : null,
        };
      });
      
      return {
        sectionId: section._id,
        byDate,
      };
    }).filter(Boolean);
    
    return {
      sections: sections.filter(Boolean).map(s => ({
        id: s!._id,
        title: s!.title,
      })),
      days: page.map(cd => ({
        date: new Date(cd.date).toISOString().split('T')[0],
      })),
      records,
      totalDays,
      offset: args.offset,
      limit: args.limit,
    };
  },
});
