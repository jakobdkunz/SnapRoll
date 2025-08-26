import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';
import { list } from '@vercel/blob';

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
  const validSessions = sessions.filter((s) => s.asset && s.asset.filePath);
  
  // Check which files actually exist in blob storage
  const fileChecks = await Promise.all(
    validSessions.map(async (s) => {
      try {
        // Extract the blob path from the filePath URL
        const url = new URL(s.asset.filePath);
        const blobPath = url.pathname.substring(1); // Remove leading slash
        
        // List blobs to check if the file exists
        const { blobs } = await list({ prefix: blobPath, limit: 1 });
        const fileExists = blobs.length > 0 && blobs[0].pathname === blobPath;
        
        return {
          session: s,
          fileExists
        };
      } catch (error) {
        console.error(`Error checking blob for session ${s.id}:`, error);
        return { session: s, fileExists: false };
      }
    })
  );
  
  // Only include sessions where the file actually exists
  const recents = fileChecks
    .filter(({ fileExists }) => fileExists)
    .map(({ session: s }) => ({ 
      id: s.id, 
      title: s.asset.title, 
      url: s.asset.filePath, 
      allowDownload: s.allowDownload, 
      lastSeenAt: (s.instructorLastSeenAt ?? s.createdAt).toISOString(),
      thumbnail: s.asset.slides[0]?.imageUrl || null
    }));
  return NextResponse.json({ recents }, { headers: { 'Cache-Control': 'no-store' } });
}


