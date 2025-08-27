import { NextRequest, NextResponse } from 'next/server';

// In-memory storage for drawings (optimized to avoid database calls)
const drawingStorage = new Map<string, any>();

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    // No database call - just return drawings from memory
    const drawings = drawingStorage.get(params.sessionId) || {};
    const drawingCount = Object.values(drawings).reduce((total: number, slideDrawings: any) => total + slideDrawings.length, 0);
    console.log(`Returning ${drawingCount} drawings across ${Object.keys(drawings).length} slides for session ${params.sessionId}`);
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
    
    if (typeof drawings !== 'object' || drawings === null) {
      return NextResponse.json({ error: 'Invalid drawings data' }, { status: 400 });
    }
    
    // Store drawings in memory (no database call)
    drawingStorage.set(params.sessionId, drawings);
    
    const drawingCount = Object.values(drawings).reduce((total: number, slideDrawings: any) => total + slideDrawings.length, 0);
    console.log(`Stored ${drawingCount} drawings across ${Object.keys(drawings).length} slides for session ${params.sessionId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving drawings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
