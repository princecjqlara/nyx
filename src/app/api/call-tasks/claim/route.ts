import { NextResponse } from 'next/server';
import { claimNextTask, leads } from '@/lib/store';

export async function POST() {
  const task = claimNextTask();

  if (!task) {
    return NextResponse.json({ error: 'No pending tasks available' }, { status: 404 });
  }

  const lead = leads.find(l => l.id === task.leadId);

  return NextResponse.json({
    task: {
      ...task,
      leadName: lead?.name,
      leadPhone: lead?.phone,
      leadEmail: lead?.email,
      leadCompany: lead?.company,
    },
  });
}
