import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const section = await prisma.section.findUnique({ where: { id: params.id } });
  if (!section) {
    return NextResponse.json({ error: 'Section not found' }, { status: 404, headers: { 'Cache-Control': 'no-store', 'Pragma': 'no-cache' } });
  }
  return NextResponse.json({ section }, { headers: { 'Cache-Control': 'no-store', 'Pragma': 'no-cache' } });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  const { title, gradient } = (await request.json()) as { title?: string; gradient?: string };
  
  const updateData: { title?: string; gradient?: string } = {};
  if (title?.trim()) updateData.title = title.trim();
  if (gradient) updateData.gradient = gradient;
  
  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
  
  const section = await prisma.section.update({ where: { id }, data: updateData });
  return NextResponse.json({ section }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  // Best-effort cascade delete
  await prisma.enrollment.deleteMany({ where: { sectionId: id } });
  const days = await prisma.classDay.findMany({ where: { sectionId: id }, select: { id: true } });
  const dayIds = days.map((d) => d.id);
  if (dayIds.length) {
    await prisma.manualStatusChange.deleteMany({ where: { classDayId: { in: dayIds } } });
    await prisma.attendanceRecord.deleteMany({ where: { classDayId: { in: dayIds } } });
  }
  const sessions = await prisma.wordCloudSession.findMany({ where: { sectionId: id }, select: { id: true } });
  const sessionIds = sessions.map((s) => s.id);
  if (sessionIds.length) {
    await prisma.wordCloudAnswer.deleteMany({ where: { sessionId: { in: sessionIds } } });
    await prisma.wordCloudSession.deleteMany({ where: { id: { in: sessionIds } } });
  }
  await prisma.classDay.deleteMany({ where: { sectionId: id } });
  await prisma.section.delete({ where: { id } });
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
