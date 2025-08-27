import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugCameronJackson() {
  console.log('🔍 Debugging Cameron Anderson and Jackson Baker...');
  
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
  
  // Find Jackson Baker
  const jackson = await prisma.user.findFirst({
    where: { 
      firstName: 'Jackson',
      lastName: 'Baker',
      role: 'STUDENT'
    }
  });
  
  if (!cameron) {
    console.log('❌ Cameron Anderson not found');
    return;
  }
  
  if (!jackson) {
    console.log('❌ Jackson Baker not found');
    return;
  }
  
  console.log(`\n👤 Cameron Anderson (${cameron.id})`);
  console.log(`👤 Jackson Baker (${jackson.id})`);
  
  // Check their enrollments
  const cameronEnrollment = await prisma.enrollment.findFirst({
    where: { sectionId: section.id, studentId: cameron.id }
  });
  
  const jacksonEnrollment = await prisma.enrollment.findFirst({
    where: { sectionId: section.id, studentId: jackson.id }
  });
  
  console.log(`\n📚 Enrollments:`);
  console.log(`  Cameron: ${cameronEnrollment?.createdAt.toISOString().split('T')[0]}`);
  console.log(`  Jackson: ${jacksonEnrollment?.createdAt.toISOString().split('T')[0]}`);
  
  // Check class days for 8/20, 8/21, 8/22
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
  
  if (!classDay20 || !classDay21 || !classDay22) {
    console.log('❌ Class days not found');
    return;
  }
  
  console.log(`\n📅 Class Days:`);
  console.log(`  8/20: ${classDay20.date.toISOString()} (${classDay20.id})`);
  console.log(`  8/21: ${classDay21.date.toISOString()} (${classDay21.id})`);
  console.log(`  8/22: ${classDay22.date.toISOString()} (${classDay22.id})`);
  
  // Check Cameron's attendance
  console.log(`\n📊 Cameron's Attendance:`);
  
  const cameron20 = await prisma.attendanceRecord.findFirst({
    where: { classDayId: classDay20.id, studentId: cameron.id }
  });
  
  const cameron21 = await prisma.attendanceRecord.findFirst({
    where: { classDayId: classDay21.id, studentId: cameron.id }
  });
  
  const cameron22 = await prisma.attendanceRecord.findFirst({
    where: { classDayId: classDay22.id, studentId: cameron.id }
  });
  
  const cameron20Manual = await prisma.manualStatusChange.findFirst({
    where: { classDayId: classDay20.id, studentId: cameron.id }
  });
  
  const cameron21Manual = await prisma.manualStatusChange.findFirst({
    where: { classDayId: classDay21.id, studentId: cameron.id }
  });
  
  const cameron22Manual = await prisma.manualStatusChange.findFirst({
    where: { classDayId: classDay22.id, studentId: cameron.id }
  });
  
  console.log(`  8/20: Attendance=${cameron20?.status || 'NONE'}, Manual=${cameron20Manual?.status || 'NONE'}`);
  console.log(`  8/21: Attendance=${cameron21?.status || 'NONE'}, Manual=${cameron21Manual?.status || 'NONE'}`);
  console.log(`  8/22: Attendance=${cameron22?.status || 'NONE'}, Manual=${cameron22Manual?.status || 'NONE'}`);
  
  // Check Jackson's attendance
  console.log(`\n📊 Jackson's Attendance:`);
  
  const jackson20 = await prisma.attendanceRecord.findFirst({
    where: { classDayId: classDay20.id, studentId: jackson.id }
  });
  
  const jackson21 = await prisma.attendanceRecord.findFirst({
    where: { classDayId: classDay21.id, studentId: jackson.id }
  });
  
  const jackson22 = await prisma.attendanceRecord.findFirst({
    where: { classDayId: classDay22.id, studentId: jackson.id }
  });
  
  const jackson20Manual = await prisma.manualStatusChange.findFirst({
    where: { classDayId: classDay20.id, studentId: jackson.id }
  });
  
  const jackson21Manual = await prisma.manualStatusChange.findFirst({
    where: { classDayId: classDay21.id, studentId: jackson.id }
  });
  
  const jackson22Manual = await prisma.manualStatusChange.findFirst({
    where: { classDayId: classDay22.id, studentId: jackson.id }
  });
  
  console.log(`  8/20: Attendance=${jackson20?.status || 'NONE'}, Manual=${jackson20Manual?.status || 'NONE'}`);
  console.log(`  8/21: Attendance=${jackson21?.status || 'NONE'}, Manual=${jackson21Manual?.status || 'NONE'}`);
  console.log(`  8/22: Attendance=${jackson22?.status || 'NONE'}, Manual=${jackson22Manual?.status || 'NONE'}`);
  
  // Calculate what the effective status should be
  console.log(`\n🧮 Effective Status Calculation:`);
  
  const isPast20 = classDay20.date < new Date();
  const isPast21 = classDay21.date < new Date();
  const isPast22 = classDay22.date < new Date();
  
  const cameronEnrolled = cameronEnrollment?.createdAt || new Date();
  const jacksonEnrolled = jacksonEnrollment?.createdAt || new Date();
  
  const day20Ymd = classDay20.date.toISOString().split('T')[0];
  const day21Ymd = classDay21.date.toISOString().split('T')[0];
  const day22Ymd = classDay22.date.toISOString().split('T')[0];
  const cameronEnrolledYmd = cameronEnrolled.toISOString().split('T')[0];
  const jacksonEnrolledYmd = jacksonEnrolled.toISOString().split('T')[0];
  
  const cameron20Enrolled = day20Ymd >= cameronEnrolledYmd;
  const cameron21Enrolled = day21Ymd >= cameronEnrolledYmd;
  const cameron22Enrolled = day22Ymd >= cameronEnrolledYmd;
  const jackson20Enrolled = day20Ymd >= jacksonEnrolledYmd;
  const jackson21Enrolled = day21Ymd >= jacksonEnrolledYmd;
  const jackson22Enrolled = day22Ymd >= jacksonEnrolledYmd;
  
  console.log(`  Cameron enrolled: ${cameronEnrolledYmd}`);
  console.log(`  Jackson enrolled: ${jacksonEnrolledYmd}`);
  console.log(`  Cameron 8/20 enrolled: ${cameron20Enrolled}, 8/21 enrolled: ${cameron21Enrolled}, 8/22 enrolled: ${cameron22Enrolled}`);
  console.log(`  Jackson 8/20 enrolled: ${jackson20Enrolled}, 8/21 enrolled: ${jackson21Enrolled}, 8/22 enrolled: ${jackson22Enrolled}`);
  
  // Calculate effective status
  const cameron20Effective = (() => {
    if (cameron20Manual) return cameron20Manual.status;
    if (cameron20?.status) return cameron20.status;
    if (isPast20 && cameron20Enrolled) return 'ABSENT';
    return 'BLANK';
  })();
  
  const cameron21Effective = (() => {
    if (cameron21Manual) return cameron21Manual.status;
    if (cameron21?.status) return cameron21.status;
    if (isPast21 && cameron21Enrolled) return 'ABSENT';
    return 'BLANK';
  })();
  
  const cameron22Effective = (() => {
    if (cameron22Manual) return cameron22Manual.status;
    if (cameron22?.status) return cameron22.status;
    if (isPast22 && cameron22Enrolled) return 'ABSENT';
    return 'BLANK';
  })();
  
  const jackson20Effective = (() => {
    if (jackson20Manual) return jackson20Manual.status;
    if (jackson20?.status) return jackson20.status;
    if (isPast20 && jackson20Enrolled) return 'ABSENT';
    return 'BLANK';
  })();
  
  const jackson21Effective = (() => {
    if (jackson21Manual) return jackson21Manual.status;
    if (jackson21?.status) return jackson21.status;
    if (isPast21 && jackson21Enrolled) return 'ABSENT';
    return 'BLANK';
  })();
  
  const jackson22Effective = (() => {
    if (jackson22Manual) return jackson22Manual.status;
    if (jackson22?.status) return jackson22.status;
    if (isPast22 && jackson22Enrolled) return 'ABSENT';
    return 'BLANK';
  })();
  
  console.log(`\n📋 Expected Effective Status:`);
  console.log(`  Cameron 8/20: ${cameron20Effective}`);
  console.log(`  Cameron 8/21: ${cameron21Effective}`);
  console.log(`  Cameron 8/22: ${cameron22Effective}`);
  console.log(`  Jackson 8/20: ${jackson20Effective}`);
  console.log(`  Jackson 8/21: ${jackson21Effective}`);
  console.log(`  Jackson 8/22: ${jackson22Effective}`);
  
  // Check for inconsistencies
  console.log(`\n🔍 Inconsistency Analysis:`);
  
  if (cameron20Effective === 'BLANK' && isPast20 && cameron20Enrolled) {
    console.log(`  ❌ Cameron 8/20 SHOULD BE ABSENT but showing as BLANK!`);
  }
  
  if (cameron21Effective === 'BLANK' && isPast21 && cameron21Enrolled) {
    console.log(`  ❌ Cameron 8/21 SHOULD BE ABSENT but showing as BLANK!`);
  }
  
  if (cameron22Effective === 'BLANK' && isPast22 && cameron22Enrolled) {
    console.log(`  ❌ Cameron 8/22 SHOULD BE ABSENT but showing as BLANK!`);
  }
  
  if (jackson20Effective === 'BLANK' && isPast20 && jackson20Enrolled) {
    console.log(`  ❌ Jackson 8/20 SHOULD BE ABSENT but showing as BLANK!`);
  }
  
  if (jackson21Effective === 'BLANK' && isPast21 && jackson21Enrolled) {
    console.log(`  ❌ Jackson 8/21 SHOULD BE ABSENT but showing as BLANK!`);
  }
  
  if (jackson22Effective === 'BLANK' && isPast22 && jackson22Enrolled) {
    console.log(`  ❌ Jackson 8/22 SHOULD BE ABSENT but showing as BLANK!`);
  }
}

debugCameronJackson()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
