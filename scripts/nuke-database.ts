import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function nukeDatabase() {
  console.log('💥 Nuking database completely...');
  
  try {
    // Delete in correct order to handle foreign key constraints
    console.log('🗑️  Deleting manual status changes...');
    await prisma.manualStatusChange.deleteMany();
    
    console.log('🗑️  Deleting attendance records...');
    await prisma.attendanceRecord.deleteMany();
    
    console.log('🗑️  Deleting word cloud answers...');
    await prisma.wordCloudAnswer.deleteMany();
    
    console.log('🗑️  Deleting word cloud sessions...');
    await prisma.wordCloudSession.deleteMany();
    
    console.log('🗑️  Deleting poll answers...');
    await prisma.pollAnswer.deleteMany();
    
    console.log('🗑️  Deleting poll sessions...');
    await prisma.pollSession.deleteMany();
    
    console.log('🗑️  Deleting slideshow slides...');
    await prisma.slideshowSlide.deleteMany();
    
    console.log('🗑️  Deleting slideshow sessions...');
    await prisma.slideshowSession.deleteMany();
    
    console.log('🗑️  Deleting slideshow assets...');
    await prisma.slideshowAsset.deleteMany();
    
    console.log('🗑️  Deleting class days...');
    await prisma.classDay.deleteMany();
    
    console.log('🗑️  Deleting enrollments...');
    await prisma.enrollment.deleteMany();
    
    console.log('🗑️  Deleting sections...');
    await prisma.section.deleteMany();
    
    console.log('🗑️  Deleting users...');
    await prisma.user.deleteMany();
    
    console.log('✅ Database completely nuked!');
    
    // Verify it's empty
    const userCount = await prisma.user.count();
    const sectionCount = await prisma.section.count();
    const classDayCount = await prisma.classDay.count();
    const enrollmentCount = await prisma.enrollment.count();
    const attendanceCount = await prisma.attendanceRecord.count();
    const manualCount = await prisma.manualStatusChange.count();
    
    console.log('\n📊 Verification:');
    console.log(`  Users: ${userCount}`);
    console.log(`  Sections: ${sectionCount}`);
    console.log(`  Class Days: ${classDayCount}`);
    console.log(`  Enrollments: ${enrollmentCount}`);
    console.log(`  Attendance Records: ${attendanceCount}`);
    console.log(`  Manual Changes: ${manualCount}`);
    
    if (userCount === 0 && sectionCount === 0 && classDayCount === 0) {
      console.log('✅ Database is completely empty!');
    } else {
      console.log('❌ Database still has data!');
    }
    
  } catch (error) {
    console.error('❌ Error nuking database:', error);
  }
}

nukeDatabase()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
