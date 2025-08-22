import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
  const { email, firstName, lastName } = (await request.json()) as { email: string; firstName: string; lastName: string };
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !firstName?.trim() || !lastName?.trim()) {
    return NextResponse.json({ error: 'Email, first name, and last name required' }, { status: 400 });
  }

  let teacher = await prisma.user.findFirst({ where: { email: cleanEmail, role: 'TEACHER' } });
  if (!teacher) {
    teacher = await prisma.user.create({ 
      data: { 
        email: cleanEmail, 
        firstName: firstName.trim(), 
        lastName: lastName.trim(), 
        role: 'TEACHER' 
      } 
    });

    if (cleanEmail === 'demo@example.com') {
      // Seed demo data for this instructor only
      // 5 sections: 4 small (15-25 students), 1 large (500 students, 250 days)
      const sectionTitles = [
        'Algebra I – Period 1',
        'Geometry – Period 2',
        'Chemistry – Honors',
        'World History',
        'Intro to Computer Science – Mega Section',
      ];
      const createdSections = await Promise.all(
        sectionTitles.map((title, i) =>
          prisma.section.create({ data: { title, teacherId: teacher!.id, gradient: `gradient-${(i % 6) + 1}` } })
        )
      );

      // Helper to generate made-up names
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
        // createMany with skipDuplicates, then fetch ids
        await prisma.user.createMany({ data: toCreate, skipDuplicates: true });
        const users = await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true, email: true } });
        return users;
      }

      // Small sections sizes
      const smallSizes = [22, 18, 25, 15];
      // Days per small section (recent N days)
      const smallDays = [45, 40, 35, 30];

      for (let i = 0; i < 4; i++) {
        const section = createdSections[i];
        const students = await ensureStudents(smallSizes[i]);
        await prisma.enrollment.createMany({ data: students.map((s) => ({ sectionId: section.id, studentId: s.id })), skipDuplicates: true });

        // Create ClassDays for recent smallDays[i]
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

        // Fetch the created classDays ids (limited set for random attendance marking)
        const cds = await prisma.classDay.findMany({ where: { sectionId: section.id }, orderBy: { date: 'desc' }, take: 12, select: { id: true } });
        // Mark ~50% random students present on these recent days
        const presentRecords: Array<{ id: string; classDayId: string; studentId: string; status: 'PRESENT' }> = [];
        for (const cd of cds) {
          for (const s of students) {
            if (Math.random() < 0.5) presentRecords.push({ id: randomUUID(), classDayId: cd.id, studentId: s.id, status: 'PRESENT' });
          }
        }
        if (presentRecords.length > 0) {
          // Insert in chunks to avoid payload limits
          for (let start = 0; start < presentRecords.length; start += 1000) {
            await prisma.attendanceRecord.createMany({ data: presentRecords.slice(start, start + 1000), skipDuplicates: true });
          }
        }
      }

      // Large mega section
      const mega = createdSections[4];
      const megaStudents = await ensureStudents(500);
      await prisma.enrollment.createMany({ data: megaStudents.map((s) => ({ sectionId: mega.id, studentId: s.id })), skipDuplicates: true });

      // Create 250 class days (past 250 days)
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

      // Mark presence for last 30 days for ~25% of students to simulate activity
      const megaCds = await prisma.classDay.findMany({ where: { sectionId: mega.id }, orderBy: { date: 'desc' }, take: 30, select: { id: true } });
      const megaPresent: Array<{ id: string; classDayId: string; studentId: string; status: 'PRESENT' }> = [];
      for (const cd of megaCds) {
        for (const s of megaStudents) {
          if (Math.random() < 0.25) megaPresent.push({ id: randomUUID(), classDayId: cd.id, studentId: s.id, status: 'PRESENT' });
        }
      }
      // Insert in chunks of 1000
      for (let start = 0; start < megaPresent.length; start += 1000) {
        await prisma.attendanceRecord.createMany({ data: megaPresent.slice(start, start + 1000), skipDuplicates: true });
      }
    }
  }

  return NextResponse.json({ teacher });
}
