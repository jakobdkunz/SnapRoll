import { NextRequest, NextResponse } from 'next/server';

// In-memory storage for drawings (optimized to avoid database calls)
const drawingStorage = new Map<string, any[]>();

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    // No database call - just return drawings from memory
    const drawings = drawingStorage.get(params.sessionId) || [];
    console.log(`Returning ${drawings.length} drawings for session ${params.sessionId}`);
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
    const body = await request.json();
    const { drawings } = body;
    
    if (!Array.isArray(drawings)) {
      return NextResponse.json({ error: 'Invalid drawings data' }, { status: 400 });
    }
    
    // Store drawings in memory (no database call)
    drawingStorage.set(params.sessionId, drawings);
    
    console.log(`Stored ${drawings.length} drawings for session ${params.sessionId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving drawings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
