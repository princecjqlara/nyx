import { NextRequest, NextResponse } from 'next/server';
import { callTasks, leads } from '@/lib/store';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const task = callTasks.find(t => t.id === id);

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  if (body.status) task.status = body.status;
  if (body.result) task.result = body.result;
  if (body.status === 'completed' || body.status === 'failed') {
    task.completedAt = new Date().toISOString();
    // Also update lead status
    const lead = leads.find(l => l.id === task.leadId);
    if (lead) {
      lead.status = body.status === 'completed' ? 'completed' : 'failed';
    }
  }

  return NextResponse.json({ task });
}
