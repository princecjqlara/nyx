import { NextResponse } from 'next/server';
import { callTasks, leads } from '@/lib/store';

export async function GET() {
  const enriched = callTasks.map(task => {
    const lead = leads.find(l => l.id === task.leadId);
    return {
      ...task,
      leadName: lead?.name || 'Unknown',
      leadPhone: lead?.phone || '',
    };
  });

  return NextResponse.json({ tasks: [...enriched].reverse() });
}
