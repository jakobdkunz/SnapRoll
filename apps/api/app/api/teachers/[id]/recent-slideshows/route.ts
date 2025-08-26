import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const teacherId = params.id;
  
  // Get recent slideshow sessions for this teacher's sections that have been converted to PNGs
  const recentSessions = await prisma.slideshowSession.findMany({
    where: {
      section: {
        teacherId: teacherId
      },
      slides: {
        some: {} // Only sessions that have been converted to PNGs
      }
    },
    include: {
      section: {
        select: {
          title: true
        }
      },
      slides: {
        where: {
          index: 1 // First slide only
        },
        take: 1
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 10 // Limit to 10 most recent
  });

  return NextResponse.json({ 
    recentSessions
  }, { 
    headers: { 'Cache-Control': 'no-store' } 
  });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const teacherId = params.id;
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }

  // Delete slideshow session and all related slides
  await prisma.slideshowSession.delete({
    where: {
      id: sessionId,
      section: {
        teacherId: teacherId
      }
    }
  });

  return NextResponse.json({ success: true });
}
