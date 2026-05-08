import { NextRequest, NextResponse } from 'next/server';
import { deleteCanvas, getAllCanvases, saveCanvas } from '@/lib/db/canvasDb';
import { CanvasState } from '@/types';

export async function GET() {
  try {
    const canvases = getAllCanvases();
    return NextResponse.json(canvases);
  } catch (error) {
    console.error('GET /api/canvas error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch canvases' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const canvas = await request.json() as CanvasState;
    const saved = saveCanvas(canvas);
    return NextResponse.json(saved);
  } catch (error) {
    console.error('POST /api/canvas error:', error);
    return NextResponse.json(
      { error: 'Failed to save canvas' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const canvasId = request.nextUrl.searchParams.get('id');

    if (!canvasId) {
      return NextResponse.json(
        { error: 'Canvas id is required' },
        { status: 400 }
      );
    }

    const deleted = deleteCanvas(canvasId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Canvas not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/canvas error:', error);
    return NextResponse.json(
      { error: 'Failed to delete canvas' },
      { status: 500 }
    );
  }
}
