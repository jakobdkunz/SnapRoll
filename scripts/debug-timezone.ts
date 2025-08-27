import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugTimezone() {
  console.log('🔍 Debugging timezone conversion...');
  
  // Find Cameron Anderson
  const cameron = await prisma.user.findFirst({
    where: { 
      firstName: 'Cameron',
      lastName: 'Anderson',
      role: 'STUDENT'
    }
  });
  
  if (!cameron) {
    console.log('❌ Cameron Anderson not found');
    return;
  }
  
  // Find Demo Section 2
  const section = await prisma.section.findFirst({
    where: { title: 'Demo Section 2' }
  });
  
  if (!section) {
    console.log('❌ Demo Section 2 not found');
    return;
  }
  
  // Get Cameron's enrollment
  const enrollment = await prisma.enrollment.findFirst({
    where: { sectionId: section.id, studentId: cameron.id }
  });
  
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
  
  console.log(`\n👤 Cameron Anderson (${cameron.id})`);
  console.log(`📚 Enrollment: ${enrollment?.createdAt.toISOString()}`);
  console.log(`📅 Class Days:`);
  console.log(`  8/20: ${classDay20?.date.toISOString()}`);
  console.log(`  8/21: ${classDay21?.date.toISOString()}`);
  console.log(`  8/22: ${classDay22?.date.toISOString()}`);
  
  // Test timezone conversion logic
  console.log(`\n🧮 Timezone Conversion Test:`);
  
  const tzMinutes = new Date().getTimezoneOffset();
  console.log(`  Timezone offset: ${tzMinutes} minutes`);
  
  const toYmd = (d: Date) => {
    const localMs = d.getTime() - tzMinutes * 60 * 1000;
    return new Date(localMs).toISOString().slice(0, 10);
  };
  
  if (enrollment && classDay20 && classDay21 && classDay22) {
    const enrollmentYmd = toYmd(enrollment.createdAt);
    const day20Ymd = toYmd(classDay20.date);
    const day21Ymd = toYmd(classDay21.date);
    const day22Ymd = toYmd(classDay22.date);
    
    console.log(`  Enrollment YMD: ${enrollmentYmd}`);
    console.log(`  8/20 YMD: ${day20Ymd}`);
    console.log(`  8/21 YMD: ${day21Ymd}`);
    console.log(`  8/22 YMD: ${day22Ymd}`);
    
    console.log(`\n📊 Enrollment Comparison:`);
    console.log(`  8/20 enrolled: ${day20Ymd >= enrollmentYmd}`);
    console.log(`  8/21 enrolled: ${day21Ymd >= enrollmentYmd}`);
    console.log(`  8/22 enrolled: ${day22Ymd >= enrollmentYmd}`);
    
    // Test without timezone conversion
    console.log(`\n🔍 Without timezone conversion:`);
    const enrollmentYmdRaw = enrollment.createdAt.toISOString().split('T')[0];
    const day20YmdRaw = classDay20.date.toISOString().split('T')[0];
    const day21YmdRaw = classDay21.date.toISOString().split('T')[0];
    const day22YmdRaw = classDay22.date.toISOString().split('T')[0];
    
    console.log(`  Enrollment YMD (raw): ${enrollmentYmdRaw}`);
    console.log(`  8/20 YMD (raw): ${day20YmdRaw}`);
    console.log(`  8/21 YMD (raw): ${day21YmdRaw}`);
    console.log(`  8/22 YMD (raw): ${day22YmdRaw}`);
    
    console.log(`\n📊 Enrollment Comparison (raw):`);
    console.log(`  8/20 enrolled: ${day20YmdRaw >= enrollmentYmdRaw}`);
    console.log(`  8/21 enrolled: ${day21YmdRaw >= enrollmentYmdRaw}`);
    console.log(`  8/22 enrolled: ${day22YmdRaw >= enrollmentYmdRaw}`);
  }
}

debugTimezone()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
