import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { complaintsApi, announcementsApi } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { FileText, Clock, CheckCircle, XCircle, AlertTriangle, PlusCircle, ArrowRight, Camera } from 'lucide-react';
import QuickReportModal from '../components/QuickReportModal';

function StatusBadge({ status }) {
  const map = {
    'Pending': 'badge badge-pending',
    'In Progress': 'badge badge-inprogress',
    'Resolved': 'badge badge-resolved',
    'Rejected': 'badge badge-rejected',
  };
  return <span className={map[status] || 'badge'}>{status}</span>;
}

function PriorityBadge({ priority }) {
  const map = { Critical: 'badge-critical', High: 'badge-high', Medium: 'badge-medium', Low: 'badge-low' };
  return <span className={`badge ${map[priority] || 'badge-low'}`}>{priority}</span>;
}

const CATEGORY_EMOJI = {
  Pothole: '🕳️', Streetlight: '💡', Garbage: '🗑️', 'Water Supply': '💧',
  Drainage: '🌊', 'Road Damage': '🚧', Encroachment: '🏗️', Noise: '🔊', Other: '📋'
};

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQuickReport, setShowQuickReport] = useState(false);

  useEffect(() => {
    Promise.all([
      complaintsApi.stats(),
      announcementsApi.getAll()
    ]).then(([statsRes, annRes]) => {
      setStats(statsRes.data);
      setAnnouncements(annRes.data || []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
      <div className="spinner" style={{ width: 36, height: 36 }} />
    </div>
  );

  const activeAnnouncement = announcements[0]; // Most recent active announcement

  const statCards = [
    { label: 'Total Complaints', value: stats?.total || 0, icon: FileText, color: 'var(--blue-light)', bg: 'rgba(59,130,246,0.1)' },
    { label: 'Pending', value: stats?.pending || 0, icon: Clock, color: 'var(--amber)', bg: 'rgba(245,158,11,0.1)' },
    { label: 'In Progress', value: stats?.inProgress || 0, icon: AlertTriangle, color: 'var(--blue-glow)', bg: 'rgba(96,165,250,0.1)' },
    { label: 'Resolved', value: stats?.resolved || 0, icon: CheckCircle, color: 'var(--green)', bg: 'rgba(34,197,94,0.1)' },
  ];

  return (
    <div>
      {/* Active Announcement Banner */}
      {activeAnnouncement && (
        <div style={{
          background: activeAnnouncement.priority === 'Critical' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.12)',
          border: activeAnnouncement.priority === 'Critical' ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(245,158,11,0.3)',
          borderRadius: 12, padding: '14px 18px', marginBottom: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22 }}>📢</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--white)', display: 'flex', alignItems: 'center', gap: 8 }}>
                {activeAnnouncement.title}
                <span className={`badge ${activeAnnouncement.priority === 'Critical' ? 'badge-critical' : 'badge-medium'}`}>
                  {activeAnnouncement.ward}
                </span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--gray-300)', marginTop: 2 }}>
                {activeAnnouncement.message}
              </div>
            </div>
          </div>

          <Link to="/announcements" className="btn btn-secondary btn-sm" style={{ flexShrink: 0 }}>
            All Notices →
          </Link>
        </div>
      )}

      {/* Welcome Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>
          Welcome back, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p style={{ color: 'var(--gray-500)', marginTop: 4, fontSize: 14 }}>
          {user?.role === 'citizen'
            ? 'Track your reported issues and file new complaints.'
            : `You have ${stats?.pending || 0} pending complaints awaiting action.`}
        </p>
      </div>

      {/* FEATURE 1: Quick Report Mode Button (Citizen Only) */}
      {user?.role === 'citizen' && (
        <button
          id="quick-report-btn"
          onClick={() => setShowQuickReport(true)}
          style={{
            width: '100%',
            padding: '16px 24px',
            borderRadius: 16,
            background: 'linear-gradient(135deg, #2563eb, #0d9488)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: 'white',
            fontSize: 18,
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            marginBottom: 28,
            boxShadow: '0 8px 30px rgba(37,99,235,0.35)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <Camera size={24} /> Report an Issue Now 📷
        </button>
      )}

      {/* Quick Report Modal */}
      {showQuickReport && (
        <QuickReportModal onClose={() => setShowQuickReport(false)} />
      )}

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 28 }}>
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="stat-card">
            <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={18} color={color} />
            </div>
            <div className="stat-value" style={{ color }}>{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 20 }}>
        {/* Recent complaints */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16 }}>Recent Complaints</h3>
            <Link to="/complaints" style={{ fontSize: 13, color: 'var(--blue-light)', display: 'flex', alignItems: 'center', gap: 4 }}>
              View all <ArrowRight size={13} />
            </Link>
          </div>

          {(!stats?.recentComplaints || stats.recentComplaints.length === 0) ? (
            <div className="empty-state" style={{ padding: 30 }}>
              <FileText size={32} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
              <p>No complaints yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {stats.recentComplaints.map(c => (
                <Link key={c.complaint_id} to={`/complaints/${c.complaint_id}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', textDecoration: 'none', transition: 'all 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'}>
                  <span style={{ fontSize: 20 }}>{CATEGORY_EMOJI[c.category] || '📋'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--white)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 2 }}>
                      {c.complaint_id} · {new Date(c.created_at).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                  <StatusBadge status={c.status} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Category breakdown + CTA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {user?.role === 'citizen' && (
            <div className="card" style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.2), rgba(13,148,136,0.2))', border: '1px solid rgba(37,99,235,0.3)', textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📢</div>
              <h3 style={{ fontSize: 15, marginBottom: 6 }}>Standard Form Report</h3>
              <p style={{ fontSize: 13, color: 'var(--gray-300)', marginBottom: 14 }}>Fill detailed complaint form with interactive map location.</p>
              <Link to="/complaints/new" className="btn btn-primary" style={{ justifyContent: 'center' }}>
                <PlusCircle size={16} /> File Complaint Form
              </Link>
            </div>
          )}

          <div className="card">
            <h3 style={{ fontSize: 15, marginBottom: 14 }}>By Category</h3>
            {(!stats?.byCategory || stats.byCategory.length === 0) ? (
              <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>No data yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {stats.byCategory.slice(0, 6).map(c => (
                  <div key={c.category}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                      <span>{CATEGORY_EMOJI[c.category]} {c.category}</span>
                      <span style={{ color: 'var(--gray-300)' }}>{c.count}</span>
                    </div>
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                      <div style={{ height: '100%', background: 'var(--blue)', borderRadius: 2, width: `${Math.min(100, (c.count / (stats.total || 1)) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
