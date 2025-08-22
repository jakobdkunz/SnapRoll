import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';

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
      // Seed demo data for this teacher only
      const sectionTitles = ['Algebra I - Period 1', 'Geometry - Period 2'];
      const sections = await Promise.all(
        sectionTitles.map((title) => prisma.section.create({
          data: { title, teacherId: teacher!.id },
        }))
      );
      const students = [
        { email: 'alex.kim@example.com', firstName: 'Alex', lastName: 'Kim' },
        { email: 'jordan.lee@example.com', firstName: 'Jordan', lastName: 'Lee' },
        { email: 'taylor.chen@example.com', firstName: 'Taylor', lastName: 'Chen' },
        { email: 'sam.patel@example.com', firstName: 'Sam', lastName: 'Patel' },
        { email: 'jamie.cruz@example.com', firstName: 'Jamie', lastName: 'Cruz' },
      ];
      const studentUsers = await Promise.all(
        students.map((s) => prisma.user.create({ 
          data: { 
            email: s.email, 
            firstName: s.firstName, 
            lastName: s.lastName, 
            role: 'STUDENT' 
          } 
        }))
      );
      await Promise.all(
        studentUsers.flatMap((s) =>
          sections.map((sec) =>
            prisma.enrollment.create({ data: { sectionId: sec.id, studentId: s.id } })
          )
        )
      );
    }
  }

  return NextResponse.json({ teacher });
}
