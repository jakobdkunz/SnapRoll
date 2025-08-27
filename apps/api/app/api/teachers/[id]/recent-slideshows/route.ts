import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const teacherId = params.id;
  
  // Get recent slideshow assets for this teacher that have been converted to PNGs
  const recentAssets = await prisma.slideshowAsset.findMany({
    where: {
      teacherId: teacherId,
      slides: {
        some: {} // Only assets that have been converted to PNGs
      }
    },
    include: {
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
    recentAssets
  }, { 
    headers: { 'Cache-Control': 'no-store' } 
  });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const teacherId = params.id;
  const { searchParams } = new URL(request.url);
  const assetId = searchParams.get('assetId');

  if (!assetId) {
    return NextResponse.json({ error: 'assetId is required' }, { status: 400 });
  }

  // Delete slideshow asset and all related slides
  await prisma.slideshowAsset.delete({
    where: {
      id: assetId,
      teacherId: teacherId
    }
  });

  return NextResponse.json({ success: true });
}
