import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testAPIJackson() {
  console.log('🧪 Testing API for Jackson Smith...');
  
  // Find Jackson Smith
  const jackson = await prisma.user.findFirst({
    where: { 
      firstName: 'Jackson',
      lastName: 'Smith',
      role: 'STUDENT'
    }
  });
  
  if (!jackson) {
    console.log('❌ Jackson Smith not found');
    return;
  }
  
  console.log(`\n👤 Jackson Smith (${jackson.id})`);
  
  // Test the API call
  console.log(`\n🌐 Testing API call: /api/students/${jackson.id}/history`);
  
  try {
    const response = await fetch(`http://localhost:3002/api/students/${jackson.id}/history?offset=0&limit=12`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ API Response:`);
      console.log(`  totalDays: ${data.totalDays}`);
      console.log(`  days: ${data.days?.length || 0}`);
      console.log(`  sections: ${data.sections?.length || 0}`);
      
      // Look for 8/19 and 8/20 in the response
      if (data.days) {
        console.log(`\n📅 Days in API response:`);
        data.days.forEach((day: any, i: number) => {
          console.log(`  ${i + 1}. ${day.date}`);
        });
        
        // Find 8/19 and 8/20
        const day19 = data.days.find((day: any) => day.date === '2025-08-19');
        const day20 = data.days.find((day: any) => day.date === '2025-08-20');
        
        if (day19) {
          console.log(`\n📊 8/19 in API response:`);
          console.log(`  Date: ${day19.date}`);
          if (day19.sections) {
            day19.sections.forEach((section: any) => {
              console.log(`  Section ${section.title}: ${section.status}`);
            });
          }
        } else {
          console.log(`\n❌ 8/19 not found in API response`);
        }
        
        if (day20) {
          console.log(`\n📊 8/20 in API response:`);
          console.log(`  Date: ${day20.date}`);
          if (day20.sections) {
            day20.sections.forEach((section: any) => {
              console.log(`  Section ${section.title}: ${section.status}`);
            });
          }
        } else {
          console.log(`\n❌ 8/20 not found in API response`);
        }
      }
    } else {
      console.log(`❌ API Error: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.log(`❌ API call failed:`, error);
  }
}

testAPIJackson()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
