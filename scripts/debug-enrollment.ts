import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugEnrollment() {
  console.log('🔍 Debugging enrollment timestamps...');
  
  // Get a sample student and their enrollments
  const student = await prisma.user.findFirst({
    where: { role: 'STUDENT' },
    include: {
      enrollments: {
        include: {
          section: true
        }
      }
    }
  });
  
  if (!student) {
    console.log('No students found');
    return;
  }
  
  console.log(`Student: ${student.firstName} ${student.lastName} (${student.email})`);
  
  for (const enrollment of student.enrollments) {
    console.log(`\nSection: ${enrollment.section.title}`);
    console.log(`Enrolled at: ${enrollment.createdAt}`);
    
    // Get some class days for this section
    const classDays = await prisma.classDay.findMany({
      where: { sectionId: enrollment.sectionId },
      orderBy: { date: 'desc' },
      take: 20
    });
    
    console.log('Recent class days:');
    let foundNoAttendance = false;
    
    for (const classDay of classDays) {
      const isPast = classDay.date < new Date();
      
      // Compare dates at day level (ignore time)
      const classDayYmd = classDay.date.toISOString().split('T')[0];
      const enrollmentYmd = enrollment.createdAt.toISOString().split('T')[0];
      const wasEnrolled = classDayYmd >= enrollmentYmd;
      
      // Check if there's an attendance record
      const attendance = await prisma.attendanceRecord.findFirst({
        where: { classDayId: classDay.id, studentId: student.id }
      });
      
      // Check if there's a manual change
      const manualChange = await prisma.manualStatusChange.findFirst({
        where: { classDayId: classDay.id, studentId: student.id }
      });
      
      if (!attendance && !manualChange && isPast && wasEnrolled) {
        console.log(`  ${classDay.date.toISOString().split('T')[0]} - Past: ${isPast}, Enrolled: ${wasEnrolled} - SHOULD SHOW AS ABSENT`);
        foundNoAttendance = true;
      } else {
        console.log(`  ${classDay.date.toISOString().split('T')[0]} - Past: ${isPast}, Enrolled: ${wasEnrolled} - Attendance: ${attendance ? attendance.status : 'NONE'}${manualChange ? `, Manual: ${manualChange.status}` : ''}`);
      }
      
      if (foundNoAttendance) break;
    }
  }
}

debugEnrollment()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
