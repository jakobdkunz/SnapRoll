import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const teacher = await prisma.user.findUnique({ where: { id: params.id } });
    if (!teacher || teacher.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }
    return NextResponse.json({
      teacher: {
        id: teacher.id,
        email: teacher.email,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
      },
    });
  } catch (err) {
    console.error('GET /api/teachers/[id] error', err);
    const e = err as { code?: string; message?: string };
    return NextResponse.json({ error: 'Internal Server Error', code: e.code, message: e.message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = (await request.json()) as { firstName?: string; lastName?: string };
    const firstName = body.firstName?.trim();
    const lastName = body.lastName?.trim();

    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'First and last name required' }, { status: 400 });
    }

    const teacher = await prisma.user.findUnique({ where: { id: params.id } });
    if (!teacher || teacher.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id: teacher.id },
      data: { firstName, lastName },
    });

    return NextResponse.json({
      teacher: {
        id: updated.id,
        email: updated.email,
        firstName: updated.firstName,
        lastName: updated.lastName,
      },
    });
  } catch (err) {
    console.error('PATCH /api/teachers/[id] error', err);
    const e = err as { code?: string; message?: string };
    return NextResponse.json({ error: 'Internal Server Error', code: e.code, message: e.message }, { status: 500 });
  }
}


