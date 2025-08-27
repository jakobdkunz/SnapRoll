import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugNewStudents() {
  console.log('🔍 Finding students in new demo data...');
  
  // Find Demo Section 2
  const section = await prisma.section.findFirst({
    where: { title: 'Demo Section 2' }
  });
  
  if (!section) {
    console.log('❌ Demo Section 2 not found');
    return;
  }
  
  // Get some students from Demo Section 2
  const enrollments = await prisma.enrollment.findMany({
    where: { sectionId: section.id },
    include: { student: true },
    take: 5
  });
  
  console.log(`\n👥 Students in Demo Section 2:`);
  enrollments.forEach((enrollment, i) => {
    console.log(`  ${i + 1}. ${enrollment.student.firstName} ${enrollment.student.lastName} (enrolled: ${enrollment.createdAt.toISOString().split('T')[0]})`);
  });
  
  if (enrollments.length > 0) {
    const sampleStudent = enrollments[0].student;
    console.log(`\n🔍 Debugging ${sampleStudent.firstName} ${sampleStudent.lastName}...`);
    
    // Get class days for 8/20, 8/21, 8/22
    const classDay20 = await prisma.classDay.findFirst({
      where: { 
        sectionId: section.id,
        date: {
          gte: new Date('2025-08-20T00:00:00.000Z'),
          lt: new Date('2025-08-21T00:00:00.000Z')
        }
      }
    });
    
    const classDay21 = await prisma.classDay.findFirst({
      where: { 
        sectionId: section.id,
        date: {
          gte: new Date('2025-08-21T00:00:00.000Z'),
          lt: new Date('2025-08-22T00:00:00.000Z')
        }
      }
    });
    
    const classDay22 = await prisma.classDay.findFirst({
      where: { 
        sectionId: section.id,
        date: {
          gte: new Date('2025-08-22T00:00:00.000Z'),
          lt: new Date('2025-08-23T00:00:00.000Z')
        }
      }
    });
    
    if (classDay20 && classDay21 && classDay22) {
      console.log(`\n📅 Class Days:`);
      console.log(`  8/20: ${classDay20.date.toISOString()}`);
      console.log(`  8/21: ${classDay21.date.toISOString()}`);
      console.log(`  8/22: ${classDay22.date.toISOString()}`);
      
      // Check attendance
      const attendance20 = await prisma.attendanceRecord.findFirst({
        where: { classDayId: classDay20.id, studentId: sampleStudent.id }
      });
      
      const attendance21 = await prisma.attendanceRecord.findFirst({
        where: { classDayId: classDay21.id, studentId: sampleStudent.id }
      });
      
      const attendance22 = await prisma.attendanceRecord.findFirst({
        where: { classDayId: classDay22.id, studentId: sampleStudent.id }
      });
      
      const manual20 = await prisma.manualStatusChange.findFirst({
        where: { classDayId: classDay20.id, studentId: sampleStudent.id }
      });
      
      const manual21 = await prisma.manualStatusChange.findFirst({
        where: { classDayId: classDay21.id, studentId: sampleStudent.id }
      });
      
      const manual22 = await prisma.manualStatusChange.findFirst({
        where: { classDayId: classDay22.id, studentId: sampleStudent.id }
      });
      
      console.log(`\n📊 ${sampleStudent.firstName}'s Attendance:`);
      console.log(`  8/20: Attendance=${attendance20?.status || 'NONE'}, Manual=${manual20?.status || 'NONE'}`);
      console.log(`  8/21: Attendance=${attendance21?.status || 'NONE'}, Manual=${manual21?.status || 'NONE'}`);
      console.log(`  8/22: Attendance=${attendance22?.status || 'NONE'}, Manual=${manual22?.status || 'NONE'}`);
      
      // Calculate expected status
      const enrollment = enrollments[0];
      const enrollmentYmd = enrollment.createdAt.toISOString().split('T')[0];
      const day20Ymd = classDay20.date.toISOString().split('T')[0];
      const day21Ymd = classDay21.date.toISOString().split('T')[0];
      const day22Ymd = classDay22.date.toISOString().split('T')[0];
      
      const wasEnrolled20 = day20Ymd >= enrollmentYmd;
      const wasEnrolled21 = day21Ymd >= enrollmentYmd;
      const wasEnrolled22 = day22Ymd >= enrollmentYmd;
      
      const isPast20 = classDay20.date < new Date();
      const isPast21 = classDay21.date < new Date();
      const isPast22 = classDay22.date < new Date();
      
      console.log(`\n🧮 Expected Status:`);
      console.log(`  Enrolled: ${enrollmentYmd}`);
      console.log(`  8/20 enrolled: ${wasEnrolled20}, past: ${isPast20}`);
      console.log(`  8/21 enrolled: ${wasEnrolled21}, past: ${isPast21}`);
      console.log(`  8/22 enrolled: ${wasEnrolled22}, past: ${isPast22}`);
      
      const effective20 = (() => {
        if (manual20) return manual20.status;
        if (attendance20?.status) return attendance20.status;
        if (isPast20 && wasEnrolled20) return 'ABSENT';
        return 'BLANK';
      })();
      
      const effective21 = (() => {
        if (manual21) return manual21.status;
        if (attendance21?.status) return attendance21.status;
        if (isPast21 && wasEnrolled21) return 'ABSENT';
        return 'BLANK';
      })();
      
      const effective22 = (() => {
        if (manual22) return manual22.status;
        if (attendance22?.status) return attendance22.status;
        if (isPast22 && wasEnrolled22) return 'ABSENT';
        return 'BLANK';
      })();
      
      console.log(`\n📋 Expected Effective Status:`);
      console.log(`  8/20: ${effective20}`);
      console.log(`  8/21: ${effective21}`);
      console.log(`  8/22: ${effective22}`);
    }
  }
}

debugNewStudents()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
