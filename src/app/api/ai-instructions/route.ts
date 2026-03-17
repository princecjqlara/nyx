import { NextRequest, NextResponse } from 'next/server';
import { getAiInstructions, updateAiInstructions } from '@/lib/store';

export async function GET() {
  return NextResponse.json(getAiInstructions());
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const updated = updateAiInstructions(body);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
