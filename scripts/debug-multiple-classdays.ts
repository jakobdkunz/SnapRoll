import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugMultipleClassDays() {
  console.log('🔍 Checking for multiple class days on same date...');
  
  // Find Demo Section 2
  const section = await prisma.section.findFirst({
    where: { title: 'Demo Section 2' }
  });
  
  if (!section) {
    console.log('❌ Demo Section 2 not found');
    return;
  }
  
  // Get all class days for this section
  const classDays = await prisma.classDay.findMany({
    where: { sectionId: section.id },
    orderBy: { date: 'asc' }
  });
  
  console.log(`\n📅 All class days in Demo Section 2:`);
  
  // Group by date
  const groupedByDate = classDays.reduce((acc, classDay) => {
    const dateStr = classDay.date.toISOString().split('T')[0];
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(classDay);
    return acc;
  }, {} as Record<string, typeof classDays>);
  
  Object.entries(groupedByDate).forEach(([date, days]) => {
    if (days.length > 1) {
      console.log(`  ${date}: ${days.length} class days (MULTIPLE!)`);
      days.forEach((day, i) => {
        console.log(`    ${i + 1}. ${day.id}`);
      });
    } else {
      console.log(`  ${date}: 1 class day`);
    }
  });
  
  // Check specifically for 8/19 and 8/20
  console.log(`\n🎯 Specific check for 8/19 and 8/20:`);
  
  const days19 = groupedByDate['2025-08-19'] || [];
  const days20 = groupedByDate['2025-08-20'] || [];
  
  console.log(`  8/19: ${days19.length} class days`);
  days19.forEach((day, i) => {
    console.log(`    ${i + 1}. ${day.id}`);
  });
  
  console.log(`  8/20: ${days20.length} class days`);
  days20.forEach((day, i) => {
    console.log(`    ${i + 1}. ${day.id}`);
  });
  
  // If there are multiple class days, check Cameron's attendance on each
  if (days19.length > 1 || days20.length > 1) {
    console.log(`\n👤 Checking Cameron's attendance on multiple class days...`);
    
    const cameron = await prisma.user.findFirst({
      where: { firstName: 'Cameron', lastName: 'Anderson' }
    });
    
    if (cameron) {
      console.log(`\n📊 Cameron's attendance on 8/19:`);
      for (const day of days19) {
        const attendance = await prisma.attendanceRecord.findFirst({
          where: { classDayId: day.id, studentId: cameron.id }
        });
        const manual = await prisma.manualStatusChange.findFirst({
          where: { classDayId: day.id, studentId: cameron.id }
        });
        console.log(`  Class day ${day.id}: Attendance=${attendance?.status || 'NONE'}, Manual=${manual?.status || 'NONE'}`);
      }
      
      console.log(`\n📊 Cameron's attendance on 8/20:`);
      for (const day of days20) {
        const attendance = await prisma.attendanceRecord.findFirst({
          where: { classDayId: day.id, studentId: cameron.id }
        });
        const manual = await prisma.manualStatusChange.findFirst({
          where: { classDayId: day.id, studentId: cameron.id }
        });
        console.log(`  Class day ${day.id}: Attendance=${attendance?.status || 'NONE'}, Manual=${manual?.status || 'NONE'}`);
      }
    }
  }
}

debugMultipleClassDays()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
