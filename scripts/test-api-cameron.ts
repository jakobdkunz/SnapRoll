import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testAPICameron() {
  console.log('🧪 Testing API for Cameron Anderson...');
  
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
  
  console.log(`\n👤 Cameron Anderson (${cameron.id})`);
  
  // Test the API call
  console.log(`\n🌐 Testing API call: /api/students/${cameron.id}/history`);
  
  try {
    const response = await fetch(`http://localhost:3002/api/students/${cameron.id}/history?offset=0&limit=12`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ API Response:`);
      console.log(`  totalDays: ${data.totalDays}`);
      console.log(`  days: ${data.days?.length || 0}`);
      console.log(`  sections: ${data.sections?.length || 0}`);
      
      // Look for 8/20, 8/21, 8/22 in the response
      if (data.days) {
        console.log(`\n📅 Days in API response:`);
        data.days.forEach((day: any, i: number) => {
          console.log(`  ${i + 1}. ${day.date}`);
        });
        
        // Find 8/20, 8/21, 8/22
        const day20 = data.days.find((day: any) => day.date === '2025-08-20');
        const day21 = data.days.find((day: any) => day.date === '2025-08-21');
        const day22 = data.days.find((day: any) => day.date === '2025-08-22');
        
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
        
        if (day21) {
          console.log(`\n📊 8/21 in API response:`);
          console.log(`  Date: ${day21.date}`);
          if (day21.sections) {
            day21.sections.forEach((section: any) => {
              console.log(`  Section ${section.title}: ${section.status}`);
            });
          }
        } else {
          console.log(`\n❌ 8/21 not found in API response`);
        }
        
        if (day22) {
          console.log(`\n📊 8/22 in API response:`);
          console.log(`  Date: ${day22.date}`);
          if (day22.sections) {
            day22.sections.forEach((section: any) => {
              console.log(`  Section ${section.title}: ${section.status}`);
            });
          }
        } else {
          console.log(`\n❌ 8/22 not found in API response`);
        }
      }
    } else {
      console.log(`❌ API Error: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.log(`❌ API call failed:`, error);
  }
}

testAPICameron()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
