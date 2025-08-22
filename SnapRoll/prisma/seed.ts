import { PrismaClient, AttendanceStatus, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.attendanceRecord.deleteMany();
  await prisma.classDay.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.section.deleteMany();
  await prisma.user.deleteMany();

  const teacher = await prisma.user.create({
    data: { name: 'Ms. Rivera', role: Role.TEACHER },
  });

  const students = await prisma.$transaction(
    ['Alex Kim', 'Jordan Lee', 'Taylor Chen', 'Sam Patel', 'Jamie Cruz'].map((name) =>
      prisma.user.create({ data: { name, role: Role.STUDENT } })
    )
  );

  const sections = await prisma.$transaction([
    prisma.section.create({
      data: { title: 'Algebra I - Period 1', joinCode: 'ALGB1', teacherId: teacher.id },
    }),
    prisma.section.create({
      data: { title: 'Geometry - Period 2', joinCode: 'GEOM2', teacherId: teacher.id },
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
