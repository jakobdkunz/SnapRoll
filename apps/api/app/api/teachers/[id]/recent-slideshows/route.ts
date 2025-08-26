import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const teacherId = params.id;
  
  // Get recent slideshow sessions for this teacher's sections
  const recentSessions = await prisma.slideshowSession.findMany({
    where: {
      section: {
        teacherId: teacherId
      },
      closedAt: null // Only active sessions
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

  // Also get slideshow assets
  const assets = await prisma.slideshowAsset.findMany({
    where: { teacherId },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  return NextResponse.json({ 
    recentSessions,
    assets 
  }, { 
    headers: { 'Cache-Control': 'no-store' } 
  });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const teacherId = params.id;
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');
  const assetId = searchParams.get('assetId');

  if (sessionId) {
    // Delete slideshow session and all related slides
    await prisma.slideshowSession.delete({
      where: {
        id: sessionId,
        section: {
          teacherId: teacherId
        }
      }
    });
  } else if (assetId) {
    // Delete slideshow asset
    await prisma.slideshowAsset.delete({
      where: {
        id: assetId,
        teacherId: teacherId
      }
    });
  } else {
    return NextResponse.json({ error: 'sessionId or assetId is required' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
