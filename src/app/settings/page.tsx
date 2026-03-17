'use client';
import { useEffect, useState } from 'react';
import { Server, Cpu, Smartphone, Globe, MessageSquare, Save, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';

interface AiInstructions {
  nvidiaApiKey: string;
  systemPrompt: string;
  openingLine: string;
  closingLine: string;
  callObjective: string;
  doNotSay: string;
  escalationRules: string;
}

export default function SettingsPage() {
  const [instructions, setInstructions] = useState<AiInstructions>({
    nvidiaApiKey: '', systemPrompt: '', openingLine: '', closingLine: '',
    callObjective: '', doNotSay: '', escalationRules: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api<AiInstructions>('/api/ai-instructions')
      .then(data => setInstructions(data))
      .catch(() => {});
  }, []);

  const saveInstructions = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const resp = await fetch('/api/ai-instructions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(instructions),
      });
      if (resp.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {}
    setSaving(false);
  };

  const update = (field: keyof AiInstructions, value: string) => {
    setInstructions(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Configure your Nyx auto-caller system and AI behavior</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* AI Instructions — Main Feature */}
        <div className="card fade-in stagger-1">
          <div className="card-header">
            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare style={{ width: '16px', height: '16px', color: 'var(--accent-violet)' }} />
              AI Call Instructions
            </span>
            {saved && <span className="badge completed" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle style={{ width: '12px', height: '12px' }} /> Saved</span>}
          </div>
          <div className="card-body">
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              These instructions are sent to the phone agent APK. They control how the AI conducts calls.
            </p>

            <div className="form-group">
              <label className="form-label">🔑 NVIDIA API Key</label>
              <input
                className="form-input"
                type="password"
                value={instructions.nvidiaApiKey}
                onChange={e => update('nvidiaApiKey', e.target.value)}
                placeholder="nvapi-..."
              />
              <small style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Get one free at <a href="https://build.nvidia.com" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-indigo)' }}>build.nvidia.com</a> — used by the phone agent for STT + LLM
              </small>
            </div>

            <div className="form-group">
              <label className="form-label">System Prompt</label>
              <textarea
                className="form-input"
                rows={4}
                value={instructions.systemPrompt}
                onChange={e => update('systemPrompt', e.target.value)}
                placeholder="You are a friendly sales representative..."
                style={{ resize: 'vertical', fontFamily: 'inherit' }}
              />
              <small style={{ fontSize: '11px', color: 'var(--text-muted)' }}>The AI personality and behavior rules</small>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Opening Line</label>
                <textarea
                  className="form-input"
                  rows={2}
                  value={instructions.openingLine}
                  onChange={e => update('openingLine', e.target.value)}
                  placeholder="Hi, this is..."
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Closing Line</label>
                <textarea
                  className="form-input"
                  rows={2}
                  value={instructions.closingLine}
                  onChange={e => update('closingLine', e.target.value)}
                  placeholder="Thank you for your time..."
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Call Objective</label>
              <textarea
                className="form-input"
                rows={2}
                value={instructions.callObjective}
                onChange={e => update('callObjective', e.target.value)}
                placeholder="What should the AI try to achieve during the call?"
                style={{ resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">⛔ Do NOT Say</label>
                <textarea
                  className="form-input"
                  rows={2}
                  value={instructions.doNotSay}
                  onChange={e => update('doNotSay', e.target.value)}
                  placeholder="Things the AI must never say..."
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">🔄 Escalation Rules</label>
                <textarea
                  className="form-input"
                  rows={2}
                  value={instructions.escalationRules}
                  onChange={e => update('escalationRules', e.target.value)}
                  placeholder="When to escalate or end the call..."
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={saveInstructions}
              disabled={saving}
              style={{ marginTop: '8px', width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {saving ? <><span className="spinner"></span> Saving...</> : <><Save style={{ width: '16px', height: '16px' }} /> Save Instructions</>}
            </button>
          </div>
        </div>

        {/* Connection Status */}
        <div className="card fade-in stagger-2">
          <div className="card-header">
            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Smartphone style={{ width: '16px', height: '16px', color: 'var(--accent-emerald)' }} />
              Phone Agent (APK)
            </span>
            <span className="badge active">Ready</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ padding: '16px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>STT Engine</div>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>NVIDIA Parakeet</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Cloud API</div>
              </div>
              <div style={{ padding: '16px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>LLM Engine</div>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>NVIDIA NIM</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Llama 3.1 / Mistral</div>
              </div>
              <div style={{ padding: '16px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>TTS Engine</div>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>Android TTS</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>On-device</div>
              </div>
              <div style={{ padding: '16px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Calling</div>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>Viber</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Intent-based</div>
              </div>
            </div>
          </div>
        </div>

        {/* API Endpoints */}
        <div className="card fade-in stagger-3">
          <div className="card-header">
            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Server style={{ width: '16px', height: '16px', color: 'var(--accent-cyan)' }} />
              API Endpoints
            </span>
          </div>
          <div className="card-body">
            <div className="transcript-box">
{`Agent API:
──────────
POST /api/call-tasks/claim      → Claim next task
PATCH /api/call-tasks/{id}      → Update task result
POST /api/call-logs             → Submit transcript
GET  /api/ai-instructions       → Fetch AI instructions

Dashboard API:
──────────
POST /api/leads/upload          → Upload CSV leads
GET  /api/leads                 → List all leads
GET  /api/call-tasks            → List call tasks
GET  /api/stats                 → Dashboard stats
PUT  /api/ai-instructions       → Update AI instructions`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
