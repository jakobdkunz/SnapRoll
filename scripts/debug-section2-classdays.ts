import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugSection2ClassDays() {
  console.log('🔍 Checking class days in Demo Section 2...');
  
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
    orderBy: { date: 'desc' },
    take: 10
  });
  
  console.log(`\n📅 Recent class days in Demo Section 2:`);
  classDays.forEach((classDay, i) => {
    console.log(`  ${i + 1}. ${classDay.date.toISOString().split('T')[0]} (${classDay.id})`);
  });
  
  // Check if 8/19 and 8/20 exist
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
  
  console.log(`\n🎯 Specific dates:`);
  console.log(`  8/19: ${classDay19 ? 'Found' : 'Not found'}`);
  console.log(`  8/20: ${classDay20 ? 'Found' : 'Not found'}`);
  
  if (classDay19) {
    console.log(`    8/19 ID: ${classDay19.id}`);
  }
  
  if (classDay20) {
    console.log(`    8/20 ID: ${classDay20.id}`);
  }
}

debugSection2ClassDays()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
