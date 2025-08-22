import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';

function randomCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const sectionId = params.id;
  const tzHeader = request.headers.get('x-tz-offset');
  const tzMinutes = tzHeader ? parseInt(tzHeader, 10) : new Date().getTimezoneOffset();
  const now = new Date();
  // Convert to client-local midnight then back to UTC for storage uniqueness
  const localNowMs = now.getTime() - tzMinutes * 60 * 1000;
  const localNow = new Date(localNowMs);
  const localMidnight = new Date(localNow.getFullYear(), localNow.getMonth(), localNow.getDate());
  const todayStart = new Date(localMidnight.getTime() + tzMinutes * 60 * 1000);

  // Generate a code that is globally unique among non-expired codes
  // A code is valid for 3 hours from (re)generation
  const expiry = new Date(now.getTime() + 3 * 60 * 60 * 1000);

  let code = randomCode();
  // Prevent collisions with any ACTIVE (non-expired) code across ALL sections
  // eslint-disable-next-line no-constant-condition
  while (await prisma.classDay.findFirst({ where: { attendanceCode: code, attendanceCodeExpiresAt: { gt: now } } })) {
    code = randomCode();
  }

  // Upsert today's class day and set the new code + expiry.
  // If there was a previous code for today, this will overwrite it, instantly invalidating the old one.
  const classDay = await prisma.classDay.upsert({
    where: { sectionId_date: { sectionId, date: todayStart } },
    update: { attendanceCode: code, attendanceCodeExpiresAt: expiry },
    create: { sectionId, date: todayStart, attendanceCode: code, attendanceCodeExpiresAt: expiry },
  });

  return NextResponse.json({ classDay });
}
