import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';
import { randomUUID } from 'crypto';

async function seedDemoData(teacherId: string) {
  // 5 sections: 4 small (15-25 students), 1 large (500 students, 250 days)
  const sectionTitles = [
    'Algebra I – Period 1',
    'Geometry – Period 2',
    'Chemistry – Honors',
    'World History',
    'Intro to Computer Science – Mega Section',
  ];

  const existing = await prisma.section.findMany({ where: { teacherId }, select: { id: true, title: true } });
  const titleToId = new Map(existing.map((s) => [s.title, s.id] as const));
  const toCreate = sectionTitles
    .filter((t) => !titleToId.has(t))
    .map((title, i) => ({ title, teacherId, gradient: `gradient-${(i % 6) + 1}` }));
  if (toCreate.length) {
    await prisma.section.createMany({ data: toCreate, skipDuplicates: true });
  }
  const sections = await prisma.section.findMany({ where: { teacherId }, orderBy: { title: 'asc' } });

  const firstNames = ['Alex', 'Jordan', 'Taylor', 'Sam', 'Jamie', 'Casey', 'Morgan', 'Riley', 'Avery', 'Logan', 'Cameron', 'Drew', 'Skyler', 'Peyton', 'Quinn', 'Harper', 'Elliot', 'Rowan', 'Sawyer', 'Charlie', 'Emerson'];
  const lastNames = ['Kim', 'Lee', 'Chen', 'Patel', 'Cruz', 'Garcia', 'Nguyen', 'Johnson', 'Smith', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris'];

  let globalIdx = 1;
  async function ensureStudents(count: number): Promise<Array<{ id: string; email: string }>> {
    const emails: string[] = [];
    const toCreate: Array<{ email: string; firstName: string; lastName: string; role: 'STUDENT' }> = [];
    for (let i = 0; i < count; i++) {
      const fn = firstNames[(globalIdx + i) % firstNames.length];
      const ln = lastNames[(globalIdx + i * 7) % lastNames.length];
      const emailAddr = `${fn.toLowerCase()}.${ln.toLowerCase()}.${globalIdx + i}@example.com`;
      emails.push(emailAddr);
      toCreate.push({ email: emailAddr, firstName: fn, lastName: ln, role: 'STUDENT' });
    }
    globalIdx += count;
    await prisma.user.createMany({ data: toCreate, skipDuplicates: true });
    const users = await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true, email: true } });
    return users;
  }

  const smallSizes = [22, 18, 25, 15];
  const smallDays = [45, 40, 35, 30];

  for (let i = 0; i < Math.min(4, sections.length); i++) {
    const section = sections[i];
    const students = await ensureStudents(smallSizes[i]);
    await prisma.enrollment.createMany({ data: students.map((s) => ({ sectionId: section.id, studentId: s.id })), skipDuplicates: true });

    const days: Date[] = [];
    for (let d = 0; d < smallDays[i]; d++) {
      const dt = new Date();
      dt.setDate(dt.getDate() - d);
      const dateUtcMidnight = new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()));
      days.push(dateUtcMidnight);
    }
    await prisma.classDay.createMany({
      data: days.map((date) => ({ id: randomUUID(), sectionId: section.id, date, attendanceCode: String(Math.floor(1000 + Math.random() * 9000)) })),
      skipDuplicates: true,
    });

    const cds = await prisma.classDay.findMany({ where: { sectionId: section.id }, orderBy: { date: 'desc' }, take: 12, select: { id: true } });
    const presentRecords: Array<{ id: string; classDayId: string; studentId: string; status: 'PRESENT' }> = [];
    for (const cd of cds) {
      for (const s of students) {
        if (Math.random() < 0.5) presentRecords.push({ id: randomUUID(), classDayId: cd.id, studentId: s.id, status: 'PRESENT' });
      }
    }
    for (let start = 0; start < presentRecords.length; start += 1000) {
      const chunk = presentRecords.slice(start, start + 1000);
      if (chunk.length) await prisma.attendanceRecord.createMany({ data: chunk, skipDuplicates: true });
    }
  }

  // Mega section
  const mega = sections.find((s) => s.title.includes('Mega Section')) ?? sections[sections.length - 1];
  if (mega) {
    const megaStudents = await ensureStudents(500);
    await prisma.enrollment.createMany({ data: megaStudents.map((s) => ({ sectionId: mega.id, studentId: s.id })), skipDuplicates: true });

    const megaDays: Date[] = [];
    for (let d = 0; d < 250; d++) {
      const dt = new Date();
      dt.setDate(dt.getDate() - d);
      const dateUtcMidnight = new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()));
      megaDays.push(dateUtcMidnight);
    }
    await prisma.classDay.createMany({
      data: megaDays.map((date) => ({ id: randomUUID(), sectionId: mega.id, date, attendanceCode: String(Math.floor(1000 + Math.random() * 9000)) })),
      skipDuplicates: true,
    });

    const megaCds = await prisma.classDay.findMany({ where: { sectionId: mega.id }, orderBy: { date: 'desc' }, take: 30, select: { id: true } });
    const megaPresent: Array<{ id: string; classDayId: string; studentId: string; status: 'PRESENT' }> = [];
    for (const cd of megaCds) {
      for (const s of megaStudents) {
        if (Math.random() < 0.25) megaPresent.push({ id: randomUUID(), classDayId: cd.id, studentId: s.id, status: 'PRESENT' });
      }
    }
    for (let start = 0; start < megaPresent.length; start += 1000) {
      const chunk = megaPresent.slice(start, start + 1000);
      if (chunk.length) await prisma.attendanceRecord.createMany({ data: chunk, skipDuplicates: true });
    }
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as { email: string; firstName?: string; lastName?: string };
  const cleanEmail = body.email?.trim().toLowerCase();
  const firstName = body.firstName?.trim();
  const lastName = body.lastName?.trim();
  if (!cleanEmail) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  let teacher = await prisma.user.findFirst({ where: { email: cleanEmail, role: 'TEACHER' } });
  if (teacher) {
    if (cleanEmail === 'demo@example.com') {
      await seedDemoData(teacher.id);
    }
    return NextResponse.json({ teacher });
  }

  // No teacher found -- if names provided, create; otherwise indicate not found
  if (!firstName || !lastName) {
    return NextResponse.json({ found: false }, { status: 200 });
  }

  teacher = await prisma.user.create({ 
    data: { 
      email: cleanEmail, 
      firstName, 
      lastName, 
      role: 'TEACHER' 
    } 
  });

  if (cleanEmail === 'demo@example.com') {
    await seedDemoData(teacher.id);
  }

  return NextResponse.json({ teacher });
}
