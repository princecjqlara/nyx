export interface Lead {
  id: string;
  uploadId: string;
  name: string;
  phone: string;
  email: string;
  company: string;
  notes: string;
  status: 'new' | 'queued' | 'called' | 'completed' | 'failed';
  createdAt: string;
}

export interface CallTask {
  id: string;
  leadId: string;
  status: 'pending' | 'claimed' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  scheduledAt: string;
  claimedAt: string | null;
  completedAt: string | null;
  attempt: number;
  maxAttempts: number;
  result: string | null;
  createdAt: string;
}

export interface CallLog {
  id: string;
  taskId: string;
  leadId: string;
  durationSeconds: number;
  transcript: string;
  aiSummary: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  outcome: 'interested' | 'not_interested' | 'callback' | 'no_answer' | 'voicemail';
  createdAt: string;
}

export interface Upload {
  id: string;
  filename: string;
  totalRows: number;
  processedRows: number;
  status: 'processing' | 'completed' | 'failed';
  createdAt: string;
}

export interface DashboardStats {
  totalLeads: number;
  pendingCalls: number;
  completedCalls: number;
  failedCalls: number;
  inProgressCalls: number;
  successRate: number;
  avgCallDuration: number;
}
