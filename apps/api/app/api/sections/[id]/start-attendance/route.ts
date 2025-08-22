import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';

function randomCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const sectionId = params.id;
  // Ensure unique per section/date
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  let code = randomCode();
  // eslint-disable-next-line no-constant-condition
  while (await prisma.classDay.findFirst({ where: { sectionId, attendanceCode: code } })) {
    code = randomCode();
  }

  const classDay = await prisma.classDay.upsert({
    where: { 
      sectionId_date: { sectionId, date: start }
    },
    update: { attendanceCode: code },
    create: { sectionId, date: start, attendanceCode: code },
  });

  return NextResponse.json({ classDay });
}
