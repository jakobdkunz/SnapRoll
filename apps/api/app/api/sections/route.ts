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
  // Prefer an unused gradient for this teacher if available
  const existing = await prisma.section.findMany({ where: { teacherId }, select: { gradient: true } });
  const used = new Set((existing.map((s) => s.gradient).filter(Boolean) as string[]));
  const candidates = ['gradient-1','gradient-2','gradient-3','gradient-4','gradient-5','gradient-6','gradient-7','gradient-8','gradient-9'];
  const pick = candidates.find((g) => !used.has(g)) || 'gradient-1';
  const section = await prisma.section.create({ 
    data: { 
      title: title.trim(), 
      teacherId,
      gradient: pick
    } 
  });
  return NextResponse.json({ section });
}
