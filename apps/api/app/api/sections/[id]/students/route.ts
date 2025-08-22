import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  const enrollments = await prisma.enrollment.findMany({
    where: { sectionId: id },
    include: { student: true },
    orderBy: [
      { student: { lastName: 'asc' } },
      { student: { firstName: 'asc' } },
    ],
  });
  const students = enrollments.map((e) => ({
    id: e.student.id,
    email: e.student.email,
    firstName: e.student.firstName,
    lastName: e.student.lastName,
  }));
  return NextResponse.json({ students });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const sectionId = params.id;
    const section = await prisma.section.findUnique({ where: { id: sectionId } });
    if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 });

    const { email, firstName, lastName } = (await request.json()) as { email: string; firstName: string; lastName: string };
    if (!email?.trim() || !firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json({ error: 'Email, first name, and last name required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Is there already a user with this email?
    const existingByEmail = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existingByEmail && existingByEmail.role !== 'STUDENT') {
      return NextResponse.json({ error: 'This email is used by an instructor account. Please use a different email.' }, { status: 400 });
    }

    // Find or create student user
    let student = await prisma.user.findFirst({ where: { email: cleanEmail } });

    if (student && student.role === 'TEACHER') {
      return NextResponse.json({ error: 'This email is used by an instructor account and cannot be added as a student.' }, { status: 400 });
    }

    if (student) {
      // If student exists, update their first and last name
      student = await prisma.user.update({
        where: { id: student.id },
        data: { firstName: firstName.trim(), lastName: lastName.trim() },
      });
    } else {
      // Create new student if not found
      student = await prisma.user.create({
        data: {
          email: cleanEmail,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          role: 'STUDENT',
        },
      });
    }

    // Already enrolled?
    const existingEnrollment = await prisma.enrollment.findFirst({ where: { sectionId, studentId: student.id } });
    if (existingEnrollment) {
      return NextResponse.json({ error: 'Student already enrolled in this section' }, { status: 400 });
    }

    await prisma.enrollment.create({ data: { sectionId, studentId: student.id } });
    return NextResponse.json({ student });
  } catch (err: unknown) {
    console.error('Add student failed', err);
    return NextResponse.json({ error: 'Failed to add student' }, { status: 500 });
  }
}
