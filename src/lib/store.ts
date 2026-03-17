// In-memory data store — will be replaced with Supabase later
import { Lead, CallTask, CallLog, Upload } from './types';

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Seed data
const now = new Date().toISOString();

export const leads: Lead[] = [
  { id: uuid(), uploadId: 'seed', name: 'Maria Santos', phone: '+639171234567', email: 'maria@example.com', company: 'Santos Trading', notes: 'Interested in premium plan', status: 'completed', createdAt: now },
  { id: uuid(), uploadId: 'seed', name: 'Juan dela Cruz', phone: '+639181234567', email: 'juan@example.com', company: 'Cruz Corp', notes: 'Follow up from event', status: 'queued', createdAt: now },
  { id: uuid(), uploadId: 'seed', name: 'Ana Reyes', phone: '+639191234567', email: 'ana@example.com', company: 'Reyes Inc', notes: '', status: 'new', createdAt: now },
  { id: uuid(), uploadId: 'seed', name: 'Pedro Garcia', phone: '+639201234567', email: 'pedro@example.com', company: 'Garcia Motors', notes: 'Callback requested', status: 'called', createdAt: now },
  { id: uuid(), uploadId: 'seed', name: 'Liza Mendoza', phone: '+639211234567', email: 'liza@example.com', company: 'Mendoza Realty', notes: '', status: 'failed', createdAt: now },
];

export const callTasks: CallTask[] = [
  { id: uuid(), leadId: leads[0].id, status: 'completed', scheduledAt: now, claimedAt: now, completedAt: now, attempt: 1, maxAttempts: 3, result: 'interested', createdAt: now },
  { id: uuid(), leadId: leads[1].id, status: 'pending', scheduledAt: now, claimedAt: null, completedAt: null, attempt: 0, maxAttempts: 3, result: null, createdAt: now },
  { id: uuid(), leadId: leads[3].id, status: 'in_progress', scheduledAt: now, claimedAt: now, completedAt: null, attempt: 1, maxAttempts: 3, result: null, createdAt: now },
  { id: uuid(), leadId: leads[4].id, status: 'failed', scheduledAt: now, claimedAt: now, completedAt: now, attempt: 3, maxAttempts: 3, result: 'no_answer', createdAt: now },
];

export const callLogs: CallLog[] = [
  { id: uuid(), taskId: callTasks[0].id, leadId: leads[0].id, durationSeconds: 185, transcript: 'Agent: Hello, this is Nyx calling...\nLead: Yes, I was expecting your call...', aiSummary: 'Lead expressed strong interest in the premium package. Requested pricing details via email.', sentiment: 'positive', outcome: 'interested', createdAt: now },
];

export const uploads: Upload[] = [
  { id: 'seed', filename: 'initial_leads.csv', totalRows: 5, processedRows: 5, status: 'completed', createdAt: now },
];

// Helper functions
export function getStats() {
  const totalLeads = leads.length;
  const pendingCalls = callTasks.filter(t => t.status === 'pending').length;
  const completedCalls = callTasks.filter(t => t.status === 'completed').length;
  const failedCalls = callTasks.filter(t => t.status === 'failed').length;
  const inProgressCalls = callTasks.filter(t => t.status === 'in_progress' || t.status === 'claimed').length;
  const total = completedCalls + failedCalls;
  const successRate = total > 0 ? Math.round((completedCalls / total) * 100) : 0;
  const avgCallDuration = callLogs.length > 0
    ? Math.round(callLogs.reduce((a, l) => a + l.durationSeconds, 0) / callLogs.length)
    : 0;

  return { totalLeads, pendingCalls, completedCalls, failedCalls, inProgressCalls, successRate, avgCallDuration };
}

export function addLead(lead: Omit<Lead, 'id' | 'createdAt'>): Lead {
  const newLead: Lead = { ...lead, id: uuid(), createdAt: new Date().toISOString() };
  leads.push(newLead);
  return newLead;
}

export function addCallTask(leadId: string): CallTask {
  const task: CallTask = {
    id: uuid(),
    leadId,
    status: 'pending',
    scheduledAt: new Date().toISOString(),
    claimedAt: null,
    completedAt: null,
    attempt: 0,
    maxAttempts: 3,
    result: null,
    createdAt: new Date().toISOString(),
  };
  callTasks.push(task);
  return task;
}

export function claimNextTask(): CallTask | null {
  const task = callTasks.find(t => t.status === 'pending');
  if (!task) return null;
  task.status = 'claimed';
  task.claimedAt = new Date().toISOString();
  task.attempt += 1;
  return task;
}

export function addUpload(upload: Omit<Upload, 'id' | 'createdAt'>): Upload {
  const newUpload: Upload = { ...upload, id: uuid(), createdAt: new Date().toISOString() };
  uploads.push(newUpload);
  return newUpload;
}

// AI Instructions — fetched by the phone agent APK
export let aiInstructions = {
  nvidiaApiKey: '',
  systemPrompt: 'You are a friendly, professional sales representative for our company. Keep responses short (1-2 sentences). Be conversational and natural. If the person is not interested, politely thank them and end the call.',
  openingLine: 'Hi, this is calling from our company. Do you have a moment to chat?',
  closingLine: 'Thank you for your time. Have a great day!',
  callObjective: 'Introduce our product/service, gauge interest, and schedule a follow-up meeting if interested.',
  doNotSay: 'Never make false promises. Never be pushy. Never argue with the lead.',
  escalationRules: 'If the lead asks for a manager or has a complaint, note it in the summary and end the call politely.',
};

export function getAiInstructions() {
  return { ...aiInstructions };
}

export function updateAiInstructions(updates: Partial<typeof aiInstructions>) {
  aiInstructions = { ...aiInstructions, ...updates };
  return aiInstructions;
}

export { uuid };
