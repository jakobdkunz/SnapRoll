import { PrismaClient, AttendanceStatus, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Delete in order of dependencies (child tables first)
  await prisma.wordCloudAnswer.deleteMany();
  await prisma.wordCloudSession.deleteMany();
  await prisma.pollAnswer.deleteMany();
  await prisma.pollSession.deleteMany();
  await prisma.slideshowSession.deleteMany();
  await prisma.slideshowAsset.deleteMany();
  await prisma.manualStatusChange.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.classDay.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.section.deleteMany();
  await prisma.user.deleteMany();

  const teacher = await prisma.user.create({
    data: { 
      email: 'demo@example.com',
      firstName: 'Demo',
      lastName: 'Teacher',
      role: Role.TEACHER 
    },
  });

  const students = await prisma.$transaction([
    prisma.user.create({ 
      data: { 
        email: 'alex.kim@example.com',
        firstName: 'Alex',
        lastName: 'Kim',
        role: Role.STUDENT 
      }
    }),
    prisma.user.create({ 
      data: { 
        email: 'jordan.lee@example.com',
        firstName: 'Jordan',
        lastName: 'Lee',
        role: Role.STUDENT 
      }
    }),
    prisma.user.create({ 
      data: { 
        email: 'taylor.chen@example.com',
        firstName: 'Taylor',
        lastName: 'Chen',
        role: Role.STUDENT 
      }
    }),
    prisma.user.create({ 
      data: { 
        email: 'sam.patel@example.com',
        firstName: 'Sam',
        lastName: 'Patel',
        role: Role.STUDENT 
      }
    }),
    prisma.user.create({ 
      data: { 
        email: 'jamie.cruz@example.com',
        firstName: 'Jamie',
        lastName: 'Cruz',
        role: Role.STUDENT 
      }
    }),
  ]);

  const sections = await prisma.$transaction([
    prisma.section.create({
      data: { 
        title: 'Algebra I - Period 1', 
        teacherId: teacher.id,
        gradient: 'gradient-1'
      },
    }),
    prisma.section.create({
      data: { 
        title: 'Geometry - Period 2', 
        teacherId: teacher.id,
        gradient: 'gradient-2'
      },
    }),
  ]);

  await prisma.$transaction(
    students.flatMap((s) =>
      sections.map((sec) =>
        prisma.enrollment.create({ data: { sectionId: sec.id, studentId: s.id } })
      )
    )
  );

  const today = new Date();
  const classDays = await prisma.$transaction(
    sections.map((sec, i) =>
      prisma.classDay.create({
        data: {
          sectionId: sec.id,
          date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - i),
          attendanceCode: (1000 + i).toString(),
        },
      })
    )
  );

  await prisma.$transaction(
    students.flatMap((student, i) =>
      classDays.map((cd, j) =>
        prisma.attendanceRecord.create({
          data: {
            classDayId: cd.id,
            studentId: student.id,
            status: [
              AttendanceStatus.PRESENT,
              AttendanceStatus.ABSENT,
              AttendanceStatus.EXCUSED,
              AttendanceStatus.NOT_JOINED,
              AttendanceStatus.BLANK,
            ][(i + j) % 5],
          },
        })
      )
    )
  );

  console.log('Database seeded.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
