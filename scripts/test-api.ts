import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testAPI() {
  console.log('🧪 Testing API logic...');
  
  // Get a sample student
  const student = await prisma.user.findFirst({
    where: { role: 'STUDENT' }
  });
  
  if (!student) {
    console.log('No students found');
    return;
  }
  
  console.log(`Testing with student: ${student.firstName} ${student.lastName} (${student.id})`);
  
  // Simulate the exact API logic from students/[id]/history/route.ts
  const studentId = student.id;
  const offset = 0;
  const limit = 12;
  
  // Sections for this student with enrollment timestamps
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId },
    include: { section: true },
    orderBy: { section: { title: 'asc' } },
  });
  
  const sections = enrollments.map((e) => ({ 
    id: e.section.id, 
    title: e.section.title,
    enrolledAt: e.createdAt 
  }));
  const sectionIds = sections.map((s) => s.id);
  
  console.log(`\nSections: ${sections.length}`);
  sections.forEach(s => console.log(`  - ${s.title} (enrolled: ${s.enrolledAt.toISOString().split('T')[0]})`));
  
  if (sectionIds.length === 0) {
    console.log('❌ No sections found for student');
    return;
  }
  
  // Get all class days across these sections for pagination
  const allClassDays = await prisma.classDay.findMany({
    where: { sectionId: { in: sectionIds } },
    orderBy: { date: 'desc' },
    select: { id: true, sectionId: true, date: true },
  });
  
  console.log(`\nTotal class days across all sections: ${allClassDays.length}`);
  
  // Build unique date list (YYYY-MM-DD) across these classDays, sorted desc
  const tzMinutes = new Date().getTimezoneOffset();
  const toYmd = (d: Date) => {
    const localMs = d.getTime() - tzMinutes * 60 * 1000;
    return new Date(localMs).toISOString().slice(0, 10);
  };
  
  // Get unique dates and apply pagination
  const seen = new Set<string>();
  const uniqueDatesDesc: string[] = [];
  for (const cd of allClassDays) {
    const ymd = toYmd(cd.date);
    if (seen.has(ymd)) continue;
    seen.add(ymd);
    uniqueDatesDesc.push(ymd);
  }
  
  const totalDays = uniqueDatesDesc.length;
  const pageDates = uniqueDatesDesc.slice(offset, offset + limit);
  
  console.log(`\nResults:`);
  console.log(`  Total unique days: ${totalDays}`);
  console.log(`  Page dates: ${pageDates.length}`);
  console.log(`  First 5 dates: ${uniqueDatesDesc.slice(0, 5).join(', ')}`);
  
  if (totalDays === 0) {
    console.log('❌ No unique dates found! This is why the API returns 0 days.');
  }
  
  // Test the actual API response structure
  console.log(`\n📋 API Response Structure:`);
  console.log(`  sections: ${sections.length} sections`);
  console.log(`  days: ${pageDates.length} days`);
  console.log(`  totalDays: ${totalDays}`);
  console.log(`  offset: ${offset}`);
  console.log(`  limit: ${limit}`);
  
  // Check if there might be an issue with the frontend expecting a different structure
  console.log(`\n🔍 Frontend Debug Info:`);
  console.log(`  Student ID in localStorage should be: ${student.id}`);
  console.log(`  Student email: ${student.email}`);
}

testAPI()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
