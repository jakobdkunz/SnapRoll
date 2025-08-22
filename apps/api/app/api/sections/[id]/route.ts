import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const section = await prisma.section.findUnique({ where: { id: params.id } });
  if (!section) {
    return NextResponse.json({ error: 'Section not found' }, { status: 404 });
  }
  return NextResponse.json({ section });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  const { title, gradient } = (await request.json()) as { title?: string; gradient?: string };
  
  const updateData: { title?: string; gradient?: string } = {};
  if (title?.trim()) updateData.title = title.trim();
  if (gradient) updateData.gradient = gradient;
  
  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }
  
  const section = await prisma.section.update({ where: { id }, data: updateData });
  return NextResponse.json({ section });
}
