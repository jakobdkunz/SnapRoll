import { NextRequest, NextResponse } from 'next/server';
import { db } from '@snaproll/lib';

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = await db.slideshowSession.findUnique({
      where: { id: params.sessionId },
      select: { id: true }
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // For now, return empty drawings array
    // In a real implementation, you'd store drawings in the database
    return NextResponse.json({ drawings: [] });
  } catch (error) {
    console.error('Error fetching drawings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = await db.slideshowSession.findUnique({
      where: { id: params.sessionId },
      select: { id: true }
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const { drawings } = await request.json();

    // For now, just return success
    // In a real implementation, you'd store drawings in the database
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving drawings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
