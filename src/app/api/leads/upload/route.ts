import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import { addLead, addCallTask, addUpload } from '@/lib/store';

export async function POST(req: NextRequest) {
  try {
    const { filename, csvContent } = await req.json();

    if (!csvContent) {
      return NextResponse.json({ error: 'No CSV content provided' }, { status: 400 });
    }

    const parsed = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim().toLowerCase(),
    });

    if (parsed.errors.length > 0 && parsed.data.length === 0) {
      return NextResponse.json({ error: 'Failed to parse CSV', details: parsed.errors }, { status: 400 });
    }

    const rows = parsed.data as Record<string, string>[];

    const upload = addUpload({
      filename: filename || 'upload.csv',
      totalRows: rows.length,
      processedRows: 0,
      status: 'processing',
    });

    let leadsCreated = 0;
    let tasksCreated = 0;

    for (const row of rows) {
      const name = row['name'] || row['full_name'] || row['contact'] || '';
      const phone = row['phone'] || row['mobile'] || row['number'] || row['phone_number'] || '';

      if (!phone) continue;

      const lead = addLead({
        uploadId: upload.id,
        name: name || 'Unknown',
        phone: phone.trim(),
        email: row['email'] || '',
        company: row['company'] || row['organization'] || '',
        notes: row['notes'] || row['remarks'] || '',
        status: 'queued',
      });

      addCallTask(lead.id);
      leadsCreated++;
      tasksCreated++;
    }

    upload.processedRows = leadsCreated;
    upload.status = 'completed';

    return NextResponse.json({ success: true, uploadId: upload.id, leadsCreated, tasksCreated });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
