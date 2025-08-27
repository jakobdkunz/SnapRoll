import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugJacksonSmithFixed() {
  console.log('🔍 Debugging Jackson Smith (fixed)...');
  
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
  
  // Use the correct class day IDs from the previous debug
  const classDay19Id = 'cmet8vaxp02lkrw48xk5wq5dg'; // 8/19
  const classDay20Id = 'cmet8vaxw02mmrw48jx1llw98'; // 8/20
  
  const classDay19 = await prisma.classDay.findUnique({
    where: { id: classDay19Id }
  });
  
  const classDay20 = await prisma.classDay.findUnique({
    where: { id: classDay20Id }
  });
  
  if (!classDay19 || !classDay20) {
    console.log('❌ Class days not found');
    return;
  }
  
  console.log(`\n📅 Class Days:`);
  console.log(`  8/19: ${classDay19.date.toISOString()} (${classDay19.id})`);
  console.log(`  8/20: ${classDay20.date.toISOString()} (${classDay20.id})`);
  
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
  
  const isPast19 = classDay19.date < new Date();
  const isPast20 = classDay20.date < new Date();
  const enrolled = enrollment?.createdAt || new Date();
  
  const day19Ymd = classDay19.date.toISOString().split('T')[0];
  const day20Ymd = classDay20.date.toISOString().split('T')[0];
  const enrolledYmd = enrolled.toISOString().split('T')[0];
  
  const day19Enrolled = day19Ymd >= enrolledYmd;
  const day20Enrolled = day20Ymd >= enrolledYmd;
  
  console.log(`  Enrolled: ${enrolledYmd}`);
  console.log(`  8/19 enrolled: ${day19Enrolled}, 8/20 enrolled: ${day20Enrolled}`);
  console.log(`  8/19 past: ${isPast19}, 8/20 past: ${isPast20}`);
  
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

debugJacksonSmithFixed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
