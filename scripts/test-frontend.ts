import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testFrontend() {
  console.log('🧪 Testing frontend localStorage and API...');
  
  // Get a sample student
  const student = await prisma.user.findFirst({
    where: { role: 'STUDENT' }
  });
  
  if (!student) {
    console.log('No students found');
    return;
  }
  
  console.log(`Student: ${student.firstName} ${student.lastName}`);
  console.log(`Student ID: ${student.id}`);
  console.log(`Student email: ${student.email}`);
  
  // Simulate what should be in localStorage
  console.log(`\n📱 localStorage should contain:`);
  console.log(`  snaproll.studentId: ${student.id}`);
  console.log(`  snaproll.studentName: ${student.firstName} ${student.lastName}`);
  
  // Test the API call directly
  console.log(`\n🌐 Testing API call: /api/students/${student.id}/history`);
  
  try {
    // Simulate the API call
    const response = await fetch(`http://localhost:3002/api/students/${student.id}/history?offset=0&limit=12`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ API Response:`);
      console.log(`  totalDays: ${data.totalDays}`);
      console.log(`  days: ${data.days?.length || 0}`);
      console.log(`  sections: ${data.sections?.length || 0}`);
      console.log(`  offset: ${data.offset}`);
      console.log(`  limit: ${data.limit}`);
      
      if (data.totalDays === 0) {
        console.log(`❌ API returned 0 totalDays!`);
      } else {
        console.log(`✅ API working correctly`);
      }
    } else {
      console.log(`❌ API Error: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.log(`❌ API call failed:`, error);
  }
}

testFrontend()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
