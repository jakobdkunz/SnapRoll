import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(_req: Request, { params }: { params: { sessionId: string } }) {
  const s = await prisma.pollSession.findUnique({ where: { id: params.sessionId } });
  if (!s) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ id: s.id, prompt: s.prompt, options: JSON.parse(s.optionsJson), showResults: s.showResults }, { headers: { 'Cache-Control': 'no-store' } });
}


