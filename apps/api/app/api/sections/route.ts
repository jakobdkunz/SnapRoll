import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const teacherId = searchParams.get('teacherId');
  if (!teacherId) return NextResponse.json({ error: 'teacherId required' }, { status: 400 });
  const sections = await prisma.section.findMany({ 
    where: { teacherId }, 
    orderBy: { title: 'asc' }
  });
  return NextResponse.json({ sections });
}

export async function POST(request: Request) {
  const { title, teacherId } = (await request.json()) as { title: string; teacherId: string };
  if (!title?.trim() || !teacherId) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  const section = await prisma.section.create({ 
    data: { 
      title: title.trim(), 
      teacherId,
      gradient: 'gradient-1' // Default gradient
    } 
  });
  return NextResponse.json({ section });
}
