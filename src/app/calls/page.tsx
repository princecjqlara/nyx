'use client';
import { useEffect, useState } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';

const statusFilters = ['all', 'pending', 'claimed', 'in_progress', 'completed', 'failed', 'skipped'];

export default function CallsPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadTasks = () => {
    setLoading(true);
    api('/api/call-tasks')
      .then(data => { setTasks(data.tasks || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { loadTasks(); }, []);

  const filtered = tasks
    .filter(t => filter === 'all' || t.status === filter)
    .filter(t => {
      if (!search) return true;
      return (t.leadName || '').toLowerCase().includes(search.toLowerCase());
    });

  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const activeCount = tasks.filter(t => t.status === 'in_progress' || t.status === 'claimed').length;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Call Queue</h1>
          <p className="page-subtitle">
            {pendingCount} pending · {activeCount} active · {tasks.length} total
          </p>
        </div>
        <button className="btn btn-secondary" onClick={loadTasks}>
          <RefreshCw style={{ width: '14px', height: '14px' }} /> Refresh
        </button>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Search />
          <input
            type="text"
            placeholder="Search by lead name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-chips">
          {statusFilters.map(s => (
            <button key={s} className={`chip ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
              {s === 'all' ? 'All' : s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="card fade-in">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Lead</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Attempt</th>
                <th>Scheduled</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No tasks found</td></tr>
              ) : (
                filtered.map(task => (
                  <tr key={task.id}>
                    <td>{task.leadName || 'Unknown'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{task.leadPhone || '—'}</td>
                    <td><span className={`badge ${task.status}`}>{task.status.replace('_', ' ')}</span></td>
                    <td style={{ color: 'var(--text-secondary)' }}>{task.attempt}/{task.maxAttempts}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                      {new Date(task.scheduledAt).toLocaleString()}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {task.result ? (
                        <span className={`badge ${task.result === 'interested' ? 'success' : task.result === 'no_answer' ? 'failed' : 'pending'}`}>
                          {task.result.replace('_', ' ')}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
