import { NextRequest, NextResponse } from 'next/server';
import { callLogs, leads, uuid } from '@/lib/store';

export async function GET() {
  const enriched = callLogs.map(log => {
    const lead = leads.find(l => l.id === log.leadId);
    return { ...log, leadName: lead?.name || 'Unknown' };
  });
  return NextResponse.json({ logs: [...enriched].reverse() });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const log = {
      id: uuid(),
      taskId: body.taskId,
      leadId: body.leadId,
      durationSeconds: body.durationSeconds || 0,
      transcript: body.transcript || '',
      aiSummary: body.aiSummary || '',
      sentiment: body.sentiment || 'neutral',
      outcome: body.outcome || 'no_answer',
      createdAt: new Date().toISOString(),
    };
    callLogs.push(log);
    return NextResponse.json({ log });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
