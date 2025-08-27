import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testAPIDetailed() {
  console.log('🧪 Testing API with detailed response...');
  
  // Find Noah Campbell
  const noah = await prisma.user.findFirst({
    where: { 
      firstName: 'Noah',
      lastName: 'Campbell',
      role: 'STUDENT'
    }
  });
  
  if (!noah) {
    console.log('❌ Noah Campbell not found');
    return;
  }
  
  console.log(`\n👤 Noah Campbell (${noah.id})`);
  
  // Test the API call
  console.log(`\n🌐 Testing API call: /api/students/${noah.id}/history`);
  
  try {
    const response = await fetch(`http://localhost:3002/api/students/${noah.id}/history?offset=0&limit=12`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ API Response:`);
      console.log(`  totalDays: ${data.totalDays}`);
      console.log(`  days: ${data.days?.length || 0}`);
      console.log(`  sections: ${data.sections?.length || 0}`);
      console.log(`  records: ${data.records?.length || 0}`);
      
      console.log(`\n📋 Sections:`);
      data.sections?.forEach((section: any, i: number) => {
        console.log(`  ${i + 1}. ${section.title} (${section.id})`);
      });
      
      console.log(`\n📅 Days (first 5):`);
      data.days?.slice(0, 5).forEach((day: any, i: number) => {
        console.log(`  ${i + 1}. ${day.date}`);
      });
      
      console.log(`\n📊 Records:`);
      data.records?.forEach((record: any, i: number) => {
        console.log(`  ${i + 1}. Section ${record.sectionId}:`);
        console.log(`     byDate keys: ${Object.keys(record.byDate).length}`);
        
        // Show first few dates
        const dates = Object.keys(record.byDate).slice(0, 3);
        dates.forEach(date => {
          const status = record.byDate[date];
          console.log(`       ${date}: ${status.status} (original: ${status.originalStatus}, manual: ${status.isManual})`);
        });
      });
      
      // Look for 8/20 specifically
      if (data.records && data.records.length > 0) {
        const record = data.records[0];
        const day20Status = record.byDate['2025-08-20'];
        if (day20Status) {
          console.log(`\n🎯 8/20 Status:`);
          console.log(`  Status: ${day20Status.status}`);
          console.log(`  Original: ${day20Status.originalStatus}`);
          console.log(`  Manual: ${day20Status.isManual}`);
          if (day20Status.manualChange) {
            console.log(`  Manual Change: ${day20Status.manualChange.status} by ${day20Status.manualChange.teacherName}`);
          }
        } else {
          console.log(`\n❌ No status found for 8/20`);
        }
      }
    } else {
      console.log(`❌ API Error: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.log(`❌ API call failed:`, error);
  }
}

testAPIDetailed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
