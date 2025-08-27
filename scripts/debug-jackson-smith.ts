import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugJacksonSmith() {
  console.log('🔍 Debugging Jackson Smith...');
  
  // Find Demo Section 2
  const section = await prisma.section.findFirst({
    where: { title: 'Demo Section 2' }
  });
  
  if (!section) {
    console.log('❌ Demo Section 2 not found');
    return;
  }
  
  // Find Jackson Smith
  const jackson = await prisma.user.findFirst({
    where: { 
      firstName: 'Jackson',
      lastName: 'Smith',
      role: 'STUDENT'
    }
  });
  
  if (!jackson) {
    console.log('❌ Jackson Smith not found');
    return;
  }
  
  console.log(`\n👤 Jackson Smith (${jackson.id})`);
  
  // Check his enrollment
  const enrollment = await prisma.enrollment.findFirst({
    where: { sectionId: section.id, studentId: jackson.id }
  });
  
  console.log(`\n📚 Enrollment: ${enrollment?.createdAt.toISOString().split('T')[0]}`);
  
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
  
  // Check Jackson's attendance
  console.log(`\n📊 Jackson's Attendance:`);
  
  const jackson19 = await prisma.attendanceRecord.findFirst({
    where: { classDayId: classDay19.id, studentId: jackson.id }
  });
  
  const jackson20 = await prisma.attendanceRecord.findFirst({
    where: { classDayId: classDay20.id, studentId: jackson.id }
  });
  
  const jackson19Manual = await prisma.manualStatusChange.findFirst({
    where: { classDayId: classDay19.id, studentId: jackson.id }
  });
  
  const jackson20Manual = await prisma.manualStatusChange.findFirst({
    where: { classDayId: classDay20.id, studentId: jackson.id }
  });
  
  console.log(`  8/19: Attendance=${jackson19?.status || 'NONE'}, Manual=${jackson19Manual?.status || 'NONE'}`);
  console.log(`  8/20: Attendance=${jackson20?.status || 'NONE'}, Manual=${jackson20Manual?.status || 'NONE'}`);
  
  // Calculate what the effective status should be
  console.log(`\n🧮 Effective Status Calculation:`);
  
  const isPast19 = new Date('2025-08-19') < new Date();
  const isPast20 = new Date('2025-08-20') < new Date();
  const enrolled = enrollment?.createdAt || new Date();
  
  const day19Ymd = '2025-08-19';
  const day20Ymd = '2025-08-20';
  const enrolledYmd = enrolled.toISOString().split('T')[0];
  
  const day19Enrolled = day19Ymd >= enrolledYmd;
  const day20Enrolled = day20Ymd >= enrolledYmd;
  
  console.log(`  Enrolled: ${enrolledYmd}`);
  console.log(`  8/19 enrolled: ${day19Enrolled}, 8/20 enrolled: ${day20Enrolled}`);
  
  // Calculate effective status
  const jackson19Effective = (() => {
    if (jackson19Manual) return jackson19Manual.status;
    if (jackson19?.status) return jackson19.status;
    if (isPast19 && day19Enrolled) return 'ABSENT';
    return 'BLANK';
  })();
  
  const jackson20Effective = (() => {
    if (jackson20Manual) return jackson20Manual.status;
    if (jackson20?.status) return jackson20.status;
    if (isPast20 && day20Enrolled) return 'ABSENT';
    return 'BLANK';
  })();
  
  console.log(`\n📋 Expected Effective Status:`);
  console.log(`  8/19: ${jackson19Effective}`);
  console.log(`  8/20: ${jackson20Effective}`);
  
  if (jackson19Effective === 'BLANK' && isPast19 && day19Enrolled) {
    console.log(`  ❌ 8/19 SHOULD BE ABSENT but showing as BLANK!`);
  }
  
  if (jackson20Effective === 'BLANK' && isPast20 && day20Enrolled) {
    console.log(`  ❌ 8/20 SHOULD BE ABSENT but showing as BLANK!`);
  }
}

debugJacksonSmith()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
