'use client';
import { useEffect, useState } from 'react';
import { Users, PhoneCall, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';
import type { DashboardStats } from '@/lib/types';
import { api } from '@/lib/api';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<DashboardStats>('/api/stats')
      .then(data => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading || !stats) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Loading...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Leads', value: stats.totalLeads, icon: Users, color: 'indigo' },
    { label: 'Pending Calls', value: stats.pendingCalls, icon: Clock, color: 'amber' },
    { label: 'In Progress', value: stats.inProgressCalls, icon: PhoneCall, color: 'cyan' },
    { label: 'Completed', value: stats.completedCalls, icon: CheckCircle, color: 'emerald' },
    { label: 'Failed', value: stats.failedCalls, icon: XCircle, color: 'rose' },
    { label: 'Success Rate', value: `${stats.successRate}%`, icon: TrendingUp, color: 'blue' },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Real-time overview of your auto-calling campaign</p>
      </div>

      <div className="stats-grid">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`stat-card ${card.color} fade-in stagger-${i + 1}`}>
              <div className={`stat-icon ${card.color}`}>
                <Icon />
              </div>
              <div className="stat-value">{card.value}</div>
              <div className="stat-label">{card.label}</div>
            </div>
          );
        })}
      </div>

      <div className="grid-2">
        <RecentCalls />
        <RecentLeads />
      </div>
    </div>
  );
}

function RecentCalls() {
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    api('/api/call-tasks')
      .then(data => setTasks(data.tasks?.slice(0, 5) || []));
  }, []);

  return (
    <div className="card fade-in stagger-5">
      <div className="card-header">
        <span className="card-title">Recent Call Tasks</span>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Lead</th>
              <th>Status</th>
              <th>Attempt</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map(t => (
              <tr key={t.id}>
                <td>{t.leadName || 'Unknown'}</td>
                <td><span className={`badge ${t.status}`}>{t.status.replace('_',' ')}</span></td>
                <td>{t.attempt}/{t.maxAttempts}</td>
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>No call tasks yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RecentLeads() {
  const [leads, setLeads] = useState<any[]>([]);

  useEffect(() => {
    api('/api/leads')
      .then(data => setLeads(data.leads?.slice(0, 5) || []));
  }, []);

  return (
    <div className="card fade-in stagger-6">
      <div className="card-header">
        <span className="card-title">Recent Leads</span>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {leads.map(l => (
              <tr key={l.id}>
                <td>{l.name}</td>
                <td>{l.phone}</td>
                <td><span className={`badge ${l.status}`}>{l.status}</span></td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>No leads yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
