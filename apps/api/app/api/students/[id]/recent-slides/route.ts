import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const studentId = params.id;
  // Find sections for the student
  const enrollments = await prisma.enrollment.findMany({ where: { studentId }, select: { sectionId: true } });
  const sectionIds = enrollments.map((e) => e.sectionId);
  if (sectionIds.length === 0) return NextResponse.json({ recents: [] }, { headers: { 'Cache-Control': 'no-store' } });
  // 72h cutoff by last instructor heartbeat
  const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000);
  const sessions = await prisma.slideshowSession.findMany({
    where: {
      sectionId: { in: sectionIds },
      instructorLastSeenAt: { gt: cutoff },
      allowDownload: true,
    },
    include: { 
      asset: {
        include: {
          slides: {
            where: { index: 1 },
            take: 1
          }
        }
      }
    },
    orderBy: { instructorLastSeenAt: 'desc' },
    take: 20,
  });
  
  // Filter out sessions with missing assets and map to include thumbnail
  const recents = sessions
    .filter((s) => s.asset && s.asset.filePath) // Only include sessions with valid assets
    .map((s) => ({ 
      id: s.id, 
      title: s.asset.title, 
      url: s.asset.filePath, 
      allowDownload: s.allowDownload, 
      lastSeenAt: (s.instructorLastSeenAt ?? s.createdAt).toISOString(),
      thumbnail: s.asset.slides[0]?.imageUrl || null
    }));
  return NextResponse.json({ recents }, { headers: { 'Cache-Control': 'no-store' } });
}


