import { NextResponse } from 'next/server';
import { leads } from '@/lib/store';

export async function GET() {
  return NextResponse.json({ leads: [...leads].reverse() });
}
