import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const sectionId = params.id;

    // Fetch all students
    const enrollments = await prisma.enrollment.findMany({
      where: { sectionId },
      include: { student: true },
      orderBy: [
        { student: { lastName: 'asc' } },
        { student: { firstName: 'asc' } },
      ],
    });

    // Fetch all class days (asc for natural order)
    const classDays = await prisma.classDay.findMany({
      where: { sectionId },
      orderBy: { date: 'asc' },
    });

    const classDayIds = classDays.map(cd => cd.id);

    // Fetch all attendance records and manual changes
    const [attendanceRecords, manualChanges] = await Promise.all([
      prisma.attendanceRecord.findMany({ where: { classDayId: { in: classDayIds } } }),
      prisma.manualStatusChange.findMany({
        where: { classDayId: { in: classDayIds } },
        include: { teacher: true },
      }),
    ]);

    const attendanceMap = new Map<string, string>();
    for (const ar of attendanceRecords) {
      attendanceMap.set(`${ar.classDayId}:${ar.studentId}`, ar.status);
    }
    const manualMap = new Map<string, string>();
    for (const mc of manualChanges) {
      manualMap.set(`${mc.classDayId}:${mc.studentId}`, mc.status);
    }

    // CSV header
    const header = ['Student', 'Email', ...classDays.map(cd => cd.date.toISOString().slice(0, 10))];
    const rows: string[] = [];
    rows.push(header.join(','));

    for (const e of enrollments) {
      const name = `${e.student.firstName} ${e.student.lastName}`;
      const email = e.student.email;
      const statuses: string[] = [];
      for (const cd of classDays) {
        const key = `${cd.id}:${e.studentId}`;
        const status = manualMap.get(key) ?? attendanceMap.get(key) ?? 'BLANK';
        statuses.push(status);
      }
      const escaped = [name, email, ...statuses].map(v => `"${String(v).replace(/"/g, '""')}"`);
      rows.push(escaped.join(','));
    }

    const body = rows.join('\n');
    return new NextResponse(body, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="attendance.csv"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('export csv error', error);
    return NextResponse.json({ error: 'Failed to export CSV' }, { status: 500 });
  }
}


