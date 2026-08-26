import React, { useEffect, useState } from 'react';
import { adminApi } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, CheckCircle2, Clock, ThumbsUp, Award, Shield, FileText, Target } from 'lucide-react';
import toast from 'react-hot-toast';

const COLORS = ['#3b82f6', '#14b8a6', '#f59e0b', '#22c55e', '#8b5cf6', '#ec4899', '#f97316'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--navy-mid)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ fontWeight: 600, color: 'var(--white)', marginBottom: 2 }}>{label}</div>
      <div style={{ color: 'var(--blue-light)' }}>Resolved: <strong>{payload[0].value}</strong></div>
    </div>
  );
};

export default function AuthorityPerformance() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.performance()
      .then(res => setData(res.data))
      .catch(() => toast.error('Failed to load performance metrics'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 350 }}>
        <div className="spinner" style={{ width: 36, height: 36 }} />
      </div>
    );
  }

  if (!data) return null;

  const { officer, assignedCount, resolvedCount, pendingCount, avgResolutionDays, satisfactionScore, resolutionRate, byCategory, officerRank, totalOfficers } = data;

  return (
    <div style={{ maxWidth: 1050 }}>
      {/* Officer Welcome Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(20,184,166,0.2) 0%, rgba(59,130,246,0.1) 100%)',
        border: '1px solid rgba(20,184,166,0.3)',
        borderRadius: 14, padding: '20px 24px', marginBottom: 24,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'rgba(20,184,166,0.25)', border: '1px solid rgba(20,184,166,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <TrendingUp size={26} color="var(--teal-light)" />
          </div>
          <div>
            <h1 className="page-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              📈 Officer Performance Dashboard
            </h1>
            <p className="page-subtitle" style={{ margin: '4px 0 0 0' }}>
              Resolution metrics, SLA compliance & citizen satisfaction stats for {officer.name} ({officer.ward || 'All Wards'})
            </p>
          </div>
        </div>

        {/* Officer Rank Badge */}
        <div style={{
          background: 'rgba(15,23,42,0.8)', padding: '10px 18px', borderRadius: 12,
          border: '1px solid rgba(245,158,11,0.4)', display: 'flex', alignItems: 'center', gap: 10
        }}>
          <Award size={24} color="var(--amber)" />
          <div>
            <div style={{ fontSize: 11, color: 'var(--gray-500)', textTransform: 'uppercase' }}>Officer Ranking</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--amber)' }}>
              Rank #{officerRank} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--gray-300)' }}>out of {totalOfficers}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
        <div className="stat-card">
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={18} color="var(--blue-light)" />
          </div>
          <div className="stat-value" style={{ color: 'var(--blue-light)' }}>{assignedCount}</div>
          <div className="stat-label">Assigned Issues</div>
        </div>

        <div className="stat-card">
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={18} color="var(--green)" />
          </div>
          <div className="stat-value" style={{ color: 'var(--green)' }}>{resolvedCount}</div>
          <div className="stat-label">Resolved Issues</div>
        </div>

        <div className="stat-card">
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={18} color="var(--amber)" />
          </div>
          <div className="stat-value" style={{ color: 'var(--amber)' }}>{pendingCount}</div>
          <div className="stat-label">Pending Resolution</div>
        </div>

        <div className="stat-card">
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(20,184,166,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Target size={18} color="var(--teal-light)" />
          </div>
          <div className="stat-value" style={{ color: 'var(--teal-light)' }}>{resolutionRate}%</div>
          <div className="stat-label">Resolution Rate</div>
        </div>

        <div className="stat-card">
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={18} color="var(--purple)" />
          </div>
          <div className="stat-value" style={{ color: 'var(--purple)' }}>{avgResolutionDays}d</div>
          <div className="stat-label">Avg Resolution Days</div>
        </div>

        <div className="stat-card">
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ThumbsUp size={18} color="var(--amber)" />
          </div>
          <div className="stat-value" style={{ color: 'var(--amber)' }}>{satisfactionScore}%</div>
          <div className="stat-label">Citizen Satisfaction</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>

        {/* Category Resolution Breakdown Bar Chart */}
        <div className="card" style={{ background: 'var(--navy-card)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 18 }}>
            📊 Resolutions by Issue Category
          </h3>

          {byCategory.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--gray-500)', fontSize: 13 }}>
              No resolved complaints recorded yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byCategory} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="resolved_count" radius={[4, 4, 0, 0]}>
                  {byCategory.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Officer Summary Card */}
        <div className="card" style={{ background: 'var(--navy-card)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield size={18} color="var(--teal-light)" /> Performance Health
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                  <span style={{ color: 'var(--gray-500)' }}>Overall Resolution Target</span>
                  <span style={{ fontWeight: 700, color: 'var(--green)' }}>{resolutionRate}%</span>
                </div>
                <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4 }}>
                  <div style={{
                    height: '100%', borderRadius: 4, width: `${resolutionRate}%`,
                    background: resolutionRate >= 80 ? 'var(--green)' : resolutionRate >= 50 ? 'var(--amber)' : '#ef4444',
                    transition: 'width 0.5s ease'
                  }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                  <span style={{ color: 'var(--gray-500)' }}>Citizen Satisfaction</span>
                  <span style={{ fontWeight: 700, color: 'var(--amber)' }}>{satisfactionScore}%</span>
                </div>
                <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4 }}>
                  <div style={{
                    height: '100%', borderRadius: 4, width: `${satisfactionScore}%`,
                    background: 'var(--amber)', transition: 'width 0.5s ease'
                  }} />
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24, padding: '12px 14px', background: 'var(--navy-mid)', borderRadius: 10, fontSize: 12, color: 'var(--gray-300)', lineHeight: 1.5 }}>
            💡 <strong>Officer Tip:</strong> Focus on complaints nearing their SLA deadline in the <strong>SLA Work Calendar</strong> to maintain your top officer ranking!
          </div>
        </div>

      </div>
    </div>
  );
}
