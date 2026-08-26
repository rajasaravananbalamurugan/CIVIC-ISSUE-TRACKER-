import React, { useEffect, useState } from 'react';
import { adminApi } from '../utils/api';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid
} from 'recharts';
import { TrendingUp, Users, FileText, CheckCircle, Clock, ThumbsUp, ThumbsDown, AlertTriangle } from 'lucide-react';

const COLORS = ['#3b82f6','#14b8a6','#f59e0b','#ef4444','#8b5cf6','#ec4899','#22c55e','#f97316','#06b6d4'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--navy-mid)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
      {label && <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--white)' }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || 'var(--gray-100)' }}>{p.name}: <strong>{p.value}</strong></div>
      ))}
    </div>
  );
};

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.analytics()
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:300 }}>
      <div className="spinner" style={{ width:36, height:36 }} />
    </div>
  );
  if (!data) return null;

  const {
    overview, byCategory, byWard, recentActivity,
    totalCitizens, totalAuthorities, monthlyTrend, avgResolutionDays,
    ratingsRow, slaBreaches
  } = data;

  const statusPieData = [
    { name: 'Pending',     value: overview?.pending     || 0, color: '#f59e0b' },
    { name: 'In Progress', value: overview?.inProgress  || 0, color: '#3b82f6' },
    { name: 'Resolved',    value: overview?.resolved    || 0, color: '#22c55e' },
    { name: 'Rejected',    value: overview?.rejected    || 0, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const resolutionRate = overview?.total > 0 ? Math.round((overview.resolved / overview.total) * 100) : 0;
  const positiveRatingPct = ratingsRow?.total > 0 ? Math.round((ratingsRow.positive / ratingsRow.total) * 100) : 0;

  const statCards = [
    { label: 'Total Complaints', value: overview?.total || 0, icon: FileText, color: 'var(--blue-light)', bg: 'rgba(59,130,246,0.1)' },
    { label: 'Resolution Rate',  value: `${resolutionRate}%`, icon: CheckCircle, color: 'var(--green)', bg: 'rgba(34,197,94,0.1)' },
    { label: 'Avg Resolution',   value: avgResolutionDays != null ? `${avgResolutionDays}d` : '—', icon: Clock, color: 'var(--amber)', bg: 'rgba(245,158,11,0.1)' },
    { label: 'Total Citizens',   value: totalCitizens || 0, icon: Users, color: 'var(--purple)', bg: 'rgba(139,92,246,0.1)' },
    { label: 'Authorities',      value: totalAuthorities || 0, icon: TrendingUp, color: 'var(--teal-light)', bg: 'rgba(20,184,166,0.1)' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">System-wide complaint insights and performance metrics</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: 14, marginBottom: 24 }}>
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="stat-card">
            <div style={{ width: 38, height: 38, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={18} color={color} />
            </div>
            <div className="stat-value" style={{ color, fontSize: 28 }}>{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Monthly Trend Line Chart ───────────────────────────────────────── */}
      {monthlyTrend && monthlyTrend.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, marginBottom: 16 }}>📈 Monthly Complaint Trend (Last 6 Months)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyTrend} margin={{ left: 0, right: 20, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 13, color: '#94a3b8' }} />
              <Line
                type="monotone" dataKey="filed" name="Filed"
                stroke="#3b82f6" strokeWidth={2.5}
                dot={{ fill: '#3b82f6', r: 4, strokeWidth: 2, stroke: '#1e3a5f' }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone" dataKey="resolved" name="Resolved"
                stroke="#22c55e" strokeWidth={2.5}
                dot={{ fill: '#22c55e', r: 4, strokeWidth: 2, stroke: '#14532d' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Ratings + SLA row ─────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* Resolution Satisfaction */}
        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            ⭐ Resolution Satisfaction
          </h3>
          {ratingsRow?.total > 0 ? (
            <>
              <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 1, padding: '12px', background: 'rgba(34,197,94,0.08)', borderRadius: 8, textAlign: 'center', border: '1px solid rgba(34,197,94,0.2)' }}>
                  <ThumbsUp size={20} color="var(--green)" style={{ margin: '0 auto 6px' }} />
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--green)' }}>{ratingsRow.positive}</div>
                  <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>Satisfied</div>
                </div>
                <div style={{ flex: 1, padding: '12px', background: 'rgba(239,68,68,0.08)', borderRadius: 8, textAlign: 'center', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <ThumbsDown size={20} color="#ef4444" style={{ margin: '0 auto 6px' }} />
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#ef4444' }}>{ratingsRow.negative}</div>
                  <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>Not Satisfied</div>
                </div>
              </div>
              <div style={{ marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>Satisfaction Rate</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: positiveRatingPct >= 70 ? 'var(--green)' : positiveRatingPct >= 40 ? 'var(--amber)' : '#ef4444' }}>
                  {positiveRatingPct}%
                </span>
              </div>
              <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4 }}>
                <div style={{
                  height: '100%', borderRadius: 4, width: `${positiveRatingPct}%`,
                  background: positiveRatingPct >= 70 ? 'var(--green)' : positiveRatingPct >= 40 ? 'var(--amber)' : '#ef4444',
                  transition: 'width 0.5s ease',
                }} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 8 }}>{ratingsRow.total} total ratings</div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--gray-500)', fontSize: 13 }}>
              <ThumbsUp size={28} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
              No ratings yet — ratings appear when resolved complaints are rated by citizens
            </div>
          )}
        </div>

        {/* SLA Breach Summary */}
        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={15} color="var(--amber)" /> SLA Breach Summary
          </h3>
          {slaBreaches && slaBreaches.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {slaBreaches.map((b, i) => (
                <div key={b.category} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{b.category}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#ef4444' }}>{b.overdue_count} overdue</span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
                      <div style={{
                        height: '100%', borderRadius: 3,
                        background: COLORS[i % COLORS.length],
                        width: `${Math.min(100, (b.overdue_count / (slaBreaches[0]?.overdue_count || 1)) * 100)}%`,
                        transition: 'width 0.4s ease',
                      }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--green)', fontSize: 13 }}>
              <CheckCircle size={28} style={{ margin: '0 auto 10px' }} />
              ✅ No SLA breaches — all complaints are within deadline
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Category bar chart */}
        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 16 }}>Complaints by Category</h3>
          {byCategory?.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={byCategory} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="category" type="category" width={90} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total" name="Total" radius={[0,4,4,0]}>
                  {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p style={{ color: 'var(--gray-500)', fontSize: 13 }}>No data yet</p>}
        </div>

        {/* Status pie */}
        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 16 }}>Status Distribution</h3>
          {statusPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                  dataKey="value" nameKey="name" paddingAngle={3}>
                  {statusPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 13, color: '#94a3b8' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p style={{ color: 'var(--gray-500)', fontSize: 13 }}>No data yet</p>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: byWard?.length > 0 ? '1fr 1fr' : '1fr', gap: 20 }}>
        {/* Ward breakdown */}
        {byWard?.length > 0 && (
          <div className="card">
            <h3 style={{ fontSize: 15, marginBottom: 16 }}>Complaints by Ward</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {byWard.map((w, i) => (
                <div key={w.ward}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                    <span style={{ fontWeight: 500 }}>{w.ward}</span>
                    <span style={{ color: 'var(--gray-300)' }}>{w.resolved}/{w.total} resolved</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
                    <div style={{ height: '100%', background: COLORS[i % COLORS.length], borderRadius: 3, width: `${w.total > 0 ? (w.resolved / w.total) * 100 : 0}%`, transition: 'width 0.4s ease' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent activity */}
        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 16 }}>Recent Activity</h3>
          {(!recentActivity || recentActivity.length === 0) ? (
            <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>No recent activity</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentActivity.map(a => {
                const statusColors = { Pending: '#f59e0b', 'In Progress': '#3b82f6', Resolved: '#22c55e', Rejected: '#ef4444' };
                const color = statusColors[a.new_status] || '#94a3b8';
                return (
                  <div key={a.id} style={{ display: 'flex', gap: 10, padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 5 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 2 }}>
                        <span style={{ color }}>{a.new_status}</span> · {a.changed_by_name} · {new Date(a.created_at).toLocaleDateString('en-IN')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
