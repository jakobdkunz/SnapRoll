import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();
  const { code, section } = body as { code: string; section?: string };
  const ok = /^[0-9]{4}$/.test(code);
  return NextResponse.json({ ok, code, section: section ?? null });
}
