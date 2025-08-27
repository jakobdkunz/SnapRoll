import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugSection2() {
  console.log('🔍 Debugging Demo Section 2...');
  
  // Find Demo Section 2
  const section = await prisma.section.findFirst({
    where: { title: 'Demo Section 2' },
    include: {
      enrollments: {
        include: { student: true }
      },
      classDays: {
        orderBy: { date: 'desc' },
        take: 10
      }
    }
  });
  
  if (!section) {
    console.log('❌ Demo Section 2 not found');
    return;
  }
  
  console.log(`\n📚 Section: ${section.title}`);
  console.log(`Students: ${section.enrollments.length}`);
  console.log(`Class days: ${section.classDays.length}`);
  
  // Get a sample student
  const student = section.enrollments[0]?.student;
  if (!student) {
    console.log('❌ No students found');
    return;
  }
  
  console.log(`\n👤 Sample student: ${student.firstName} ${student.lastName}`);
  console.log(`Enrolled: ${section.enrollments[0].createdAt.toISOString().split('T')[0]}`);
  
  // Check recent class days for this student
  for (const classDay of section.classDays) {
    const isPast = classDay.date < new Date();
    const enrollmentDate = section.enrollments[0].createdAt;
    
    // Compare dates at day level
    const classDayYmd = classDay.date.toISOString().split('T')[0];
    const enrollmentYmd = enrollmentDate.toISOString().split('T')[0];
    const wasEnrolled = classDayYmd >= enrollmentYmd;
    
    // Check attendance record
    const attendance = await prisma.attendanceRecord.findFirst({
      where: { classDayId: classDay.id, studentId: student.id }
    });
    
    // Check manual change
    const manualChange = await prisma.manualStatusChange.findFirst({
      where: { classDayId: classDay.id, studentId: student.id }
    });
    
    // Calculate effective status
    const effectiveStatus = (() => {
      if (manualChange) return manualChange.status; // Manual changes take precedence
      if (attendance?.status) return attendance.status; // Has attendance record
      
      if (isPast && wasEnrolled) {
        return 'ABSENT'; // Past date, was enrolled, no record = ABSENT
      }
      return 'BLANK'; // Not enrolled yet or future date
    })();
    
    console.log(`\n📅 ${classDay.date.toISOString().split('T')[0]}:`);
    console.log(`  Past: ${isPast}, Enrolled: ${wasEnrolled}`);
    console.log(`  Attendance record: ${attendance?.status || 'NONE'}`);
    console.log(`  Manual change: ${manualChange?.status || 'NONE'}`);
    console.log(`  Effective status: ${effectiveStatus}`);
    
    if (effectiveStatus === 'BLANK' && isPast && wasEnrolled) {
      console.log(`  ❌ SHOULD BE ABSENT but showing as BLANK!`);
    }
  }
}

debugSection2()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
