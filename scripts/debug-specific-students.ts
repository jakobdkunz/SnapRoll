import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugSpecificStudents() {
  console.log('🔍 Debugging specific students...');
  
  // Find Demo Section 2
  const section = await prisma.section.findFirst({
    where: { title: 'Demo Section 2' }
  });
  
  if (!section) {
    console.log('❌ Demo Section 2 not found');
    return;
  }
  
  // Find Cameron Anderson
  const cameron = await prisma.user.findFirst({
    where: { 
      firstName: 'Cameron',
      lastName: 'Anderson',
      role: 'STUDENT'
    }
  });
  
  // Find Ethan Allen
  const ethan = await prisma.user.findFirst({
    where: { 
      firstName: 'Ethan',
      lastName: 'Allen',
      role: 'STUDENT'
    }
  });
  
  if (!cameron) {
    console.log('❌ Cameron Anderson not found');
    return;
  }
  
  if (!ethan) {
    console.log('❌ Ethan Allen not found');
    return;
  }
  
  console.log(`\n👤 Cameron Anderson (${cameron.id})`);
  console.log(`👤 Ethan Allen (${ethan.id})`);
  
  // Check their enrollments
  const cameronEnrollment = await prisma.enrollment.findFirst({
    where: { sectionId: section.id, studentId: cameron.id }
  });
  
  const ethanEnrollment = await prisma.enrollment.findFirst({
    where: { sectionId: section.id, studentId: ethan.id }
  });
  
  console.log(`\n📚 Enrollments:`);
  console.log(`  Cameron: ${cameronEnrollment?.createdAt.toISOString().split('T')[0]}`);
  console.log(`  Ethan: ${ethanEnrollment?.createdAt.toISOString().split('T')[0]}`);
  
  // Check class days for 8/19 and 8/20
  const classDay19 = await prisma.classDay.findFirst({
    where: { 
      sectionId: section.id,
      date: new Date('2025-08-19')
    }
  });
  
  const classDay20 = await prisma.classDay.findFirst({
    where: { 
      sectionId: section.id,
      date: new Date('2025-08-20')
    }
  });
  
  if (!classDay19 || !classDay20) {
    console.log('❌ Class days not found');
    return;
  }
  
  console.log(`\n📅 Class Days:`);
  console.log(`  8/19: ${classDay19.id}`);
  console.log(`  8/20: ${classDay20.id}`);
  
  // Check Cameron's attendance
  console.log(`\n📊 Cameron's Attendance:`);
  
  const cameron19 = await prisma.attendanceRecord.findFirst({
    where: { classDayId: classDay19.id, studentId: cameron.id }
  });
  
  const cameron20 = await prisma.attendanceRecord.findFirst({
    where: { classDayId: classDay20.id, studentId: cameron.id }
  });
  
  const cameron19Manual = await prisma.manualStatusChange.findFirst({
    where: { classDayId: classDay19.id, studentId: cameron.id }
  });
  
  const cameron20Manual = await prisma.manualStatusChange.findFirst({
    where: { classDayId: classDay20.id, studentId: cameron.id }
  });
  
  console.log(`  8/19: Attendance=${cameron19?.status || 'NONE'}, Manual=${cameron19Manual?.status || 'NONE'}`);
  console.log(`  8/20: Attendance=${cameron20?.status || 'NONE'}, Manual=${cameron20Manual?.status || 'NONE'}`);
  
  // Check Ethan's attendance
  console.log(`\n📊 Ethan's Attendance:`);
  
  const ethan19 = await prisma.attendanceRecord.findFirst({
    where: { classDayId: classDay19.id, studentId: ethan.id }
  });
  
  const ethan20 = await prisma.attendanceRecord.findFirst({
    where: { classDayId: classDay20.id, studentId: ethan.id }
  });
  
  const ethan19Manual = await prisma.manualStatusChange.findFirst({
    where: { classDayId: classDay19.id, studentId: ethan.id }
  });
  
  const ethan20Manual = await prisma.manualStatusChange.findFirst({
    where: { classDayId: classDay20.id, studentId: ethan.id }
  });
  
  console.log(`  8/19: Attendance=${ethan19?.status || 'NONE'}, Manual=${ethan19Manual?.status || 'NONE'}`);
  console.log(`  8/20: Attendance=${ethan20?.status || 'NONE'}, Manual=${ethan20Manual?.status || 'NONE'}`);
  
  // Calculate what the effective status should be
  console.log(`\n🧮 Effective Status Calculation:`);
  
  const isPast19 = new Date('2025-08-19') < new Date();
  const isPast20 = new Date('2025-08-20') < new Date();
  const cameronEnrolled = cameronEnrollment?.createdAt || new Date();
  const ethanEnrolled = ethanEnrollment?.createdAt || new Date();
  
  const cameron19Ymd = '2025-08-19';
  const cameron20Ymd = '2025-08-20';
  const cameronEnrolledYmd = cameronEnrolled.toISOString().split('T')[0];
  const ethanEnrolledYmd = ethanEnrolled.toISOString().split('T')[0];
  
  const cameron19Enrolled = cameron19Ymd >= cameronEnrolledYmd;
  const cameron20Enrolled = cameron20Ymd >= cameronEnrolledYmd;
  const ethan19Enrolled = cameron19Ymd >= ethanEnrolledYmd;
  const ethan20Enrolled = cameron20Ymd >= ethanEnrolledYmd;
  
  console.log(`  Cameron enrolled: ${cameronEnrolledYmd}`);
  console.log(`  Ethan enrolled: ${ethanEnrolledYmd}`);
  console.log(`  Cameron 8/19 enrolled: ${cameron19Enrolled}, 8/20 enrolled: ${cameron20Enrolled}`);
  console.log(`  Ethan 8/19 enrolled: ${ethan19Enrolled}, 8/20 enrolled: ${ethan20Enrolled}`);
  
  // Calculate effective status
  const cameron19Effective = (() => {
    if (cameron19Manual) return cameron19Manual.status;
    if (cameron19?.status) return cameron19.status;
    if (isPast19 && cameron19Enrolled) return 'ABSENT';
    return 'BLANK';
  })();
  
  const cameron20Effective = (() => {
    if (cameron20Manual) return cameron20Manual.status;
    if (cameron20?.status) return cameron20.status;
    if (isPast20 && cameron20Enrolled) return 'ABSENT';
    return 'BLANK';
  })();
  
  const ethan19Effective = (() => {
    if (ethan19Manual) return ethan19Manual.status;
    if (ethan19?.status) return ethan19.status;
    if (isPast19 && ethan19Enrolled) return 'ABSENT';
    return 'BLANK';
  })();
  
  const ethan20Effective = (() => {
    if (ethan20Manual) return ethan20Manual.status;
    if (ethan20?.status) return ethan20.status;
    if (isPast20 && ethan20Enrolled) return 'ABSENT';
    return 'BLANK';
  })();
  
  console.log(`\n📋 Expected Effective Status:`);
  console.log(`  Cameron 8/19: ${cameron19Effective}`);
  console.log(`  Cameron 8/20: ${cameron20Effective}`);
  console.log(`  Ethan 8/19: ${ethan19Effective}`);
  console.log(`  Ethan 8/20: ${ethan20Effective}`);
}

debugSpecificStudents()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
