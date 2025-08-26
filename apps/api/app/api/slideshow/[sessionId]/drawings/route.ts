import { NextRequest, NextResponse } from 'next/server';
import { db } from '@snaproll/lib';

// In-memory storage for drawings (in production, use database)
const drawingStorage = new Map<string, any[]>();

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

    const drawings = drawingStorage.get(params.sessionId) || [];
    return NextResponse.json({ drawings });
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
    
    // Store drawings in memory
    drawingStorage.set(params.sessionId, drawings);
    
    console.log(`Stored ${drawings.length} drawings for session ${params.sessionId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving drawings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
