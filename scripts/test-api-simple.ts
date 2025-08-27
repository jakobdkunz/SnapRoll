import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testAPISimple() {
  console.log('🧪 Testing API with minimal logic...');
  
  try {
    // Get a sample student
    const student = await prisma.user.findFirst({
      where: { role: 'STUDENT' }
    });
    
    if (!student) {
      console.log('No students found');
      return;
    }
    
    console.log(`Student: ${student.firstName} ${student.lastName} (${student.id})`);
    
    // Get enrollments
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: student.id },
      include: { section: true }
    });
    
    console.log(`Enrollments: ${enrollments.length}`);
    
    if (enrollments.length === 0) {
      console.log('No enrollments found');
      return;
    }
    
    const sectionIds = enrollments.map(e => e.section.id);
    console.log(`Section IDs: ${sectionIds.join(', ')}`);
    
    // Get class days
    const classDays = await prisma.classDay.findMany({
      where: { sectionId: { in: sectionIds } },
      orderBy: { date: 'desc' },
      take: 5
    });
    
    console.log(`Class days found: ${classDays.length}`);
    
    // Test the date conversion logic
    const tzMinutes = new Date().getTimezoneOffset();
    console.log(`Timezone offset: ${tzMinutes} minutes`);
    
    for (const classDay of classDays) {
      const ymd = classDay.date.toISOString().split('T')[0];
      console.log(`Class day: ${classDay.date.toISOString()} -> ${ymd}`);
    }
    
    console.log('✅ Basic API logic test passed');
    
  } catch (error) {
    console.error('❌ Error in API logic:', error);
  }
}

testAPISimple()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
