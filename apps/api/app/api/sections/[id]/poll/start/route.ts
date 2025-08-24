import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const sectionId = params.id;
  const { prompt, options } = (await request.json()) as { prompt: string; options: string[] };
  const cleaned = (options || []).map((s) => s.trim()).filter(Boolean);
  if (!prompt?.trim() || cleaned.length < 2) {
    return NextResponse.json({ error: 'Prompt and at least two options are required' }, { status: 400 });
  }
  // Close existing open poll sessions for this section
  await prisma.pollSession.updateMany({ where: { sectionId, closedAt: null }, data: { closedAt: new Date() } });
  const session = await prisma.pollSession.create({
    data: {
      sectionId,
      prompt: prompt.trim(),
      optionsJson: JSON.stringify(cleaned),
      instructorLastSeenAt: new Date(),
    },
  });
  return NextResponse.json({ session }, { headers: { 'Cache-Control': 'no-store', 'Pragma': 'no-cache' } });
}


