'use client';
import { useEffect, useState } from 'react';
import { Search, FileText } from 'lucide-react';
import { api } from '@/lib/api';

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/api/call-logs')
      .then(data => { setLogs(data.logs || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = logs.filter(l => {
    if (!search) return true;
    return (l.leadName || '').toLowerCase().includes(search.toLowerCase()) ||
           (l.aiSummary || '').toLowerCase().includes(search.toLowerCase());
  });

  const sentimentColor = (s: string) => {
    if (s === 'positive') return 'success';
    if (s === 'negative') return 'failed';
    return 'pending';
  };

  const outcomeColor = (o: string) => {
    if (o === 'interested') return 'success';
    if (o === 'not_interested' || o === 'no_answer') return 'failed';
    if (o === 'callback') return 'active';
    return 'pending';
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Call Logs</h1>
        <p className="page-subtitle">Transcripts and AI analysis of completed calls</p>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Search />
          <input
            type="text"
            placeholder="Search logs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card fade-in">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Lead</th>
                <th>Duration</th>
                <th>Sentiment</th>
                <th>Outcome</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <FileText style={{ width: '32px', height: '32px', opacity: 0.3, marginBottom: '8px' }} />
                  <div>No call logs yet</div>
                </td></tr>
              ) : (
                filtered.map(log => (
                  <>
                    <tr
                      key={log.id}
                      onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ width: '32px', color: 'var(--text-muted)' }}>
                        <span style={{ transition: 'transform 0.2s', display: 'inline-block', transform: expandedId === log.id ? 'rotate(90deg)' : 'rotate(0)' }}>
                          ▸
                        </span>
                      </td>
                      <td>{log.leadName || 'Unknown'}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {Math.floor(log.durationSeconds / 60)}m {log.durationSeconds % 60}s
                      </td>
                      <td><span className={`badge ${sentimentColor(log.sentiment)}`}>{log.sentiment}</span></td>
                      <td><span className={`badge ${outcomeColor(log.outcome)}`}>{log.outcome?.replace('_', ' ')}</span></td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                    {expandedId === log.id && (
                      <tr key={`${log.id}-detail`}>
                        <td colSpan={6} style={{ padding: '0 16px 20px' }}>
                          <div style={{ marginBottom: '12px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              AI Summary
                            </div>
                            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                              {log.aiSummary}
                            </p>
                          </div>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Transcript
                            </div>
                            <div className="transcript-box">
                              {log.transcript}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
