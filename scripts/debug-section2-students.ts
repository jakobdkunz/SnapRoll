import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugSection2Students() {
  console.log('🔍 Listing students in Demo Section 2...');
  
  // Find Demo Section 2
  const section = await prisma.section.findFirst({
    where: { title: 'Demo Section 2' },
    include: {
      enrollments: {
        include: { student: true }
      }
    }
  });
  
  if (!section) {
    console.log('❌ Demo Section 2 not found');
    return;
  }
  
  console.log(`\n📚 Section: ${section.title}`);
  console.log(`Students: ${section.enrollments.length}`);
  
  // List first 10 students
  console.log('\n👥 First 10 students:');
  section.enrollments.slice(0, 10).forEach((enrollment, i) => {
    const student = enrollment.student;
    console.log(`  ${i + 1}. ${student.firstName} ${student.lastName} (enrolled: ${enrollment.createdAt.toISOString().split('T')[0]})`);
  });
  
  // Get a sample student for testing
  const sampleStudent = section.enrollments[0]?.student;
  if (sampleStudent) {
    console.log(`\n🧪 Sample student for testing: ${sampleStudent.firstName} ${sampleStudent.lastName}`);
    console.log(`Enrolled: ${section.enrollments[0].createdAt.toISOString().split('T')[0]}`);
  }
}

debugSection2Students()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
