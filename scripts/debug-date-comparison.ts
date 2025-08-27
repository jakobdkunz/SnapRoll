import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugDateComparison() {
  console.log('🔍 Debugging date comparison...');
  
  // Find Demo Section 2
  const section = await prisma.section.findFirst({
    where: { title: 'Demo Section 2' }
  });
  
  if (!section) {
    console.log('❌ Demo Section 2 not found');
    return;
  }
  
  // Get the class days for 8/19 and 8/20
  const classDays = await prisma.classDay.findMany({
    where: { sectionId: section.id },
    orderBy: { date: 'desc' },
    take: 10
  });
  
  console.log(`\n📅 Class days with exact dates:`);
  classDays.forEach((classDay, i) => {
    const dateStr = classDay.date.toISOString().split('T')[0];
    console.log(`  ${i + 1}. ${dateStr} (${classDay.id})`);
  });
  
  // Try to find 8/19 and 8/20 with different approaches
  console.log(`\n🎯 Looking for 8/19 and 8/20:`);
  
  // Approach 1: Exact date match
  const classDay19Exact = await prisma.classDay.findFirst({
    where: { 
      sectionId: section.id,
      date: new Date('2025-08-19T00:00:00.000Z')
    }
  });
  
  const classDay20Exact = await prisma.classDay.findFirst({
    where: { 
      sectionId: section.id,
      date: new Date('2025-08-20T00:00:00.000Z')
    }
  });
  
  console.log(`  Exact match 8/19: ${classDay19Exact ? 'Found' : 'Not found'}`);
  console.log(`  Exact match 8/20: ${classDay20Exact ? 'Found' : 'Not found'}`);
  
  // Approach 2: Date range
  const classDay19Range = await prisma.classDay.findFirst({
    where: { 
      sectionId: section.id,
      date: {
        gte: new Date('2025-08-19T00:00:00.000Z'),
        lt: new Date('2025-08-20T00:00:00.000Z')
      }
    }
  });
  
  const classDay20Range = await prisma.classDay.findFirst({
    where: { 
      sectionId: section.id,
      date: {
        gte: new Date('2025-08-20T00:00:00.000Z'),
        lt: new Date('2025-08-21T00:00:00.000Z')
      }
    }
  });
  
  console.log(`  Range match 8/19: ${classDay19Range ? 'Found' : 'Not found'}`);
  console.log(`  Range match 8/20: ${classDay20Range ? 'Found' : 'Not found'}`);
  
  if (classDay19Range) {
    console.log(`    8/19 range: ${classDay19Range.date.toISOString()}`);
  }
  
  if (classDay20Range) {
    console.log(`    8/20 range: ${classDay20Range.date.toISOString()}`);
  }
  
  // Check what the actual dates are
  console.log(`\n🔍 Actual dates in database:`);
  const day19 = classDays.find(day => day.date.toISOString().split('T')[0] === '2025-08-19');
  const day20 = classDays.find(day => day.date.toISOString().split('T')[0] === '2025-08-20');
  
  if (day19) {
    console.log(`  8/19: ${day19.date.toISOString()} (${day19.id})`);
  } else {
    console.log(`  8/19: Not found in list`);
  }
  
  if (day20) {
    console.log(`  8/20: ${day20.date.toISOString()} (${day20.id})`);
  } else {
    console.log(`  8/20: Not found in list`);
  }
}

debugDateComparison()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
