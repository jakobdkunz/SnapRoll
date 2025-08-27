import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Generate realistic names and emails
function generateName() {
  const firstNames = [
    'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Isabella', 'Lucas', 'Sophia', 'Mason',
    'Mia', 'Oliver', 'Charlotte', 'Elijah', 'Amelia', 'James', 'Harper', 'Benjamin', 'Evelyn', 'Sebastian',
    'Abigail', 'Michael', 'Emily', 'Daniel', 'Elizabeth', 'Henry', 'Sofia', 'Jackson', 'Avery', 'Samuel',
    'Ella', 'David', 'Madison', 'Joseph', 'Scarlett', 'Carter', 'Victoria', 'Owen', 'Luna', 'Wyatt',
    'Grace', 'John', 'Chloe', 'Jack', 'Penelope', 'Luke', 'Layla', 'Jayden', 'Riley', 'Dylan'
  ];
  
  const lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
    'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
    'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
    'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
    'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'
  ];
  
  return {
    firstName: firstNames[Math.floor(Math.random() * firstNames.length)],
    lastName: lastNames[Math.floor(Math.random() * lastNames.length)]
  };
}

function generateEmail(firstName: string, lastName: string) {
  const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  const number = Math.floor(Math.random() * 999) + 1;
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${number}@${domain}`;
}

function generateAttendanceStatus() {
  const rand = Math.random();
  if (rand < 0.85) return 'PRESENT'; // 85% present
  return 'BLANK'; // 15% blank (ABSENT and EXCUSED only exist as manual changes)
}

async function generateDemoData() {
  console.log('🚀 Starting demo data generation...');
  
  // Nuke existing data (in correct order to handle foreign key constraints)
  console.log('🗑️  Clearing existing data...');
  await prisma.manualStatusChange.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.wordCloudAnswer.deleteMany();
  await prisma.wordCloudSession.deleteMany();
  await prisma.pollAnswer.deleteMany();
  await prisma.pollSession.deleteMany();
  await prisma.slideshowSlide.deleteMany();
  await prisma.slideshowSession.deleteMany();
  await prisma.slideshowAsset.deleteMany();
  await prisma.classDay.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.section.deleteMany();
  await prisma.user.deleteMany();
  
  // Create demo teacher
  console.log('👨‍🏫 Creating demo teacher...');
  const teacher = await prisma.user.create({
    data: {
      email: 'demo@example.com',
      firstName: 'Demo',
      lastName: 'Teacher',
      role: 'TEACHER'
    }
  });
  
  // Create sections
  const sections = [];
  
  // Four sections with 23 people and a month of attendance history
  for (let i = 1; i <= 4; i++) {
    const section = await prisma.section.create({
      data: {
        title: `Demo Section ${i}`,
        gradient: `gradient-${i}`,
        teacherId: teacher.id
      }
    });
    sections.push(section);
  }
  
  // Section with 500 people and 300 days of attendance history
  const largeSection = await prisma.section.create({
    data: {
      title: 'Large Demo Section',
      gradient: 'gradient-5',
      teacherId: teacher.id
    }
  });
  sections.push(largeSection);
  
  // Section with no people and no attendance history
  const emptySection = await prisma.section.create({
    data: {
      title: 'Empty Demo Section',
      gradient: 'gradient-6',
      teacherId: teacher.id
    }
  });
  sections.push(emptySection);
  
  console.log('👥 Creating students and enrollments...');
  
  // Create students for the first 4 sections (23 each)
  const students = [];
  for (let i = 0; i < 23 * 4; i++) {
    const name = generateName();
    const student = await prisma.user.create({
      data: {
        email: generateEmail(name.firstName, name.lastName),
        firstName: name.firstName,
        lastName: name.lastName,
        role: 'STUDENT'
      }
    });
    students.push(student);
  }
  
  // Create students for the large section (500)
  const largeStudents = [];
  for (let i = 0; i < 500; i++) {
    const name = generateName();
    const student = await prisma.user.create({
      data: {
        email: generateEmail(name.firstName, name.lastName),
        firstName: name.firstName,
        lastName: name.lastName,
        role: 'STUDENT'
      }
    });
    largeStudents.push(student);
  }
  
  // Enroll students in sections
  console.log('📚 Enrolling students...');
  
  // Enroll 23 students in each of the first 4 sections
  for (let sectionIndex = 0; sectionIndex < 4; sectionIndex++) {
    const section = sections[sectionIndex];
    const sectionStudents = students.slice(sectionIndex * 23, (sectionIndex + 1) * 23);
    
    for (const student of sectionStudents) {
      // Random enrollment date within the last year (but at least 6 months ago)
      const enrollmentDate = new Date();
      enrollmentDate.setDate(enrollmentDate.getDate() - (180 + Math.floor(Math.random() * 185)));
      
      await prisma.enrollment.create({
        data: {
          sectionId: section.id,
          studentId: student.id,
          createdAt: enrollmentDate
        }
      });
    }
  }
  
  // Enroll 500 students in the large section
  for (const student of largeStudents) {
    // Random enrollment date within the last 2 years (but at least 1 year ago)
    const enrollmentDate = new Date();
    enrollmentDate.setDate(enrollmentDate.getDate() - (365 + Math.floor(Math.random() * 365)));
    
    await prisma.enrollment.create({
      data: {
        sectionId: largeSection.id,
        studentId: student.id,
        createdAt: enrollmentDate
      }
    });
  }
  
  console.log('📅 Creating class days and attendance records...');
  
  // Generate class days and attendance for the first 4 sections (1 month)
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  
  for (let sectionIndex = 0; sectionIndex < 4; sectionIndex++) {
    const section = sections[sectionIndex];
    const sectionStudents = students.slice(sectionIndex * 23, (sectionIndex + 1) * 23);
    
    for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
      const classDate = new Date(startDate);
      classDate.setDate(classDate.getDate() + dayOffset);
      
      // Skip weekends
      if (classDate.getDay() === 0 || classDate.getDay() === 6) continue;
      
      const classDay = await prisma.classDay.create({
        data: {
          sectionId: section.id,
          date: classDate,
          attendanceCode: Math.random().toString(36).substring(2, 6).toUpperCase()
        }
      });
      
      // Generate attendance records
      for (const student of sectionStudents) {
        const enrollment = await prisma.enrollment.findFirst({
          where: { sectionId: section.id, studentId: student.id }
        });
        
        // Only create attendance if student was enrolled on this date
        if (enrollment && classDate >= enrollment.createdAt) {
          const status = generateAttendanceStatus();
          
          if (status !== 'BLANK') {
            await prisma.attendanceRecord.create({
              data: {
                classDayId: classDay.id,
                studentId: student.id,
                status
              }
            });
          }
          
          // Add some manual changes (including to PRESENT)
          if (Math.random() < 0.05) { // 5% chance of manual change
            const manualStatuses = ['PRESENT', 'ABSENT', 'EXCUSED'];
            const newStatus = manualStatuses[Math.floor(Math.random() * manualStatuses.length)];
            
            await prisma.manualStatusChange.create({
              data: {
                classDayId: classDay.id,
                studentId: student.id,
                teacherId: teacher.id,
                status: newStatus
              }
            });
          }
        }
      }
    }
  }
  
  // Generate class days and attendance for the large section (300 days)
  console.log('📊 Generating large section data...');
  const largeStartDate = new Date();
  largeStartDate.setDate(largeStartDate.getDate() - 300);
  
  for (let dayOffset = 0; dayOffset < 300; dayOffset++) {
    const classDate = new Date(largeStartDate);
    classDate.setDate(classDate.getDate() + dayOffset);
    
    // Skip weekends
    if (classDate.getDay() === 0 || classDate.getDay() === 6) continue;
    
    const classDay = await prisma.classDay.create({
      data: {
        sectionId: largeSection.id,
        date: classDate,
        attendanceCode: Math.random().toString(36).substring(2, 6).toUpperCase()
      }
    });
    
    // Generate attendance records for a subset of students each day (for performance)
    const studentsForDay = largeStudents.slice(0, Math.floor(largeStudents.length * 0.8)); // 80% of students
    
    for (const student of studentsForDay) {
      const enrollment = await prisma.enrollment.findFirst({
        where: { sectionId: largeSection.id, studentId: student.id }
      });
      
      // Only create attendance if student was enrolled on this date
      if (enrollment && classDate >= enrollment.createdAt) {
        const status = generateAttendanceStatus();
        
        if (status !== 'BLANK') {
          await prisma.attendanceRecord.create({
            data: {
              classDayId: classDay.id,
              studentId: student.id,
              status
            }
          });
        }
        
        // Add some manual changes (including to PRESENT)
        if (Math.random() < 0.03) { // 3% chance of manual change
          const manualStatuses = ['PRESENT', 'ABSENT', 'EXCUSED'];
          const newStatus = manualStatuses[Math.floor(Math.random() * manualStatuses.length)];
          
          await prisma.manualStatusChange.create({
            data: {
              classDayId: classDay.id,
              studentId: student.id,
              teacherId: teacher.id,
              status: newStatus
            }
          });
        }
      }
    }
  }
  
  console.log('✅ Demo data generation complete!');
  console.log(`📊 Created:`);
  console.log(`   - 1 teacher (demo@example.com)`);
  console.log(`   - 6 sections (4 small, 1 large, 1 empty)`);
  console.log(`   - ${students.length} students for small sections`);
  console.log(`   - ${largeStudents.length} students for large section`);
  console.log(`   - ~30 days of attendance for small sections`);
  console.log(`   - ~300 days of attendance for large section`);
  console.log(`   - Realistic enrollment timestamps`);
  console.log(`   - Manual changes sprinkled throughout`);
}

generateDemoData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
