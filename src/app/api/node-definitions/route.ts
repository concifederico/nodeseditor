import { NextRequest, NextResponse } from 'next/server';
import { NodeDefinition } from '@/types';
import {
  getAllNodeDefinitions,
  saveAllNodeDefinitions,
} from '@/lib/db/nodeDefinitionsDb';

export async function GET() {
  try {
    return NextResponse.json(getAllNodeDefinitions());
  } catch (error) {
    console.error('GET /api/node-definitions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch node definitions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const definitions = (await request.json()) as NodeDefinition[];
    return NextResponse.json(saveAllNodeDefinitions(definitions));
  } catch (error) {
    console.error('POST /api/node-definitions error:', error);
    return NextResponse.json(
      { error: 'Failed to save node definitions' },
      { status: 500 }
    );
  }
}
