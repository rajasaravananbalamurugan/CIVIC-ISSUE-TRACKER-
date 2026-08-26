import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../utils/api';
import { AlertOctagon, AlertTriangle, Clock, UserX, TrendingUp, ShieldAlert, ArrowRight, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CrisisDashboard() {
  const [data, setData] = useState({ critical: [], overdue: [], wardSpikes: [], unassigned48h: [] });
  const [loading, setLoading] = useState(true);
  const [escalatingId, setEscalatingId] = useState(null);

  const fetchCrisisData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.crisis();
      setData(res.data);
    } catch (err) {
      toast.error('Failed to load crisis data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCrisisData();
  }, [fetchCrisisData]);

  const handleEscalate = async (complaintId) => {
    setEscalatingId(complaintId);
    try {
      await adminApi.escalate(complaintId);
      toast.success(`🚨 Complaint ${complaintId} escalated to Critical!`);
      fetchCrisisData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Escalation failed');
    } finally {
      setEscalatingId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 350 }}>
        <div className="spinner" style={{ width: 36, height: 36 }} />
      </div>
    );
  }

  const { critical, overdue, wardSpikes, unassigned48h } = data;
  const totalAlerts = critical.length + overdue.length + wardSpikes.length + unassigned48h.length;

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(239,68,68,0.2) 0%, rgba(185,28,28,0.1) 100%)',
        border: '1px solid rgba(239,68,68,0.4)',
        borderRadius: 14, padding: '20px 24px', marginBottom: 24,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 12,
            background: 'rgba(239,68,68,0.25)', border: '1px solid rgba(239,68,68,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <ShieldAlert size={24} color="#ef4444" />
          </div>
          <div>
            <h1 className="page-title" style={{ color: '#ef4444', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              🔴 Crisis Control Center
            </h1>
            <p className="page-subtitle" style={{ margin: '4px 0 0 0', color: 'var(--gray-300)' }}>
              Real-time emergency monitoring, SLA breaches, ward spikes & unassigned backlog
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            background: 'rgba(15,23,42,0.8)', padding: '8px 16px', borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center'
          }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: totalAlerts > 0 ? '#ef4444' : 'var(--green)' }}>
              {totalAlerts}
            </div>
            <div style={{ fontSize: 11, color: 'var(--gray-500)', textTransform: 'uppercase' }}>Active Alerts</div>
          </div>
        </div>
      </div>

      {/* Grid of Crisis Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: 20 }}>

        {/* 1. Critical Complaints Card */}
        <div className="card" style={{ border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, color: '#ef4444', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertOctagon size={18} /> Critical Priority Complaints ({critical.length})
            </h3>
            <span style={{ fontSize: 11, background: 'rgba(239,68,68,0.2)', color: '#ef4444', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>
              Immediate Action Needed
            </span>
          </div>

          {critical.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--green)', fontSize: 13 }}>
              <CheckCircle2 size={24} style={{ margin: '0 auto 8px' }} />
              No critical active complaints. All clear!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {critical.map(c => (
                <div key={c.id} style={{
                  padding: '12px 14px', background: 'var(--navy-mid)', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12
                }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Link to={`/complaints/${c.complaint_id}`} style={{ color: 'var(--blue-light)', fontFamily: 'monospace', fontWeight: 600, fontSize: 13 }}>
                        {c.complaint_id}
                      </Link>
                      <span className="badge badge-critical">{c.category}</span>
                      {c.is_escalated ? <span style={{ fontSize: 10, background: '#ef4444', color: 'white', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>ESCALATED</span> : null}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--white)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.title}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>
                      📍 {c.ward || c.address} · Filed by {c.citizen_name}
                    </div>
                  </div>

                  {!c.is_escalated && (
                    <button
                      onClick={() => handleEscalate(c.complaint_id)}
                      disabled={escalatingId === c.complaint_id}
                      className="btn btn-secondary btn-sm"
                      style={{ borderColor: 'rgba(239,68,68,0.5)', color: '#ef4444', flexShrink: 0 }}
                    >
                      {escalatingId === c.complaint_id ? <span className="spinner" /> : '🚨 Escalate'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. Overdue SLA Complaints Card */}
        <div className="card" style={{ border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, color: 'var(--amber)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={18} /> Overdue SLA Breaches ({overdue.length})
            </h3>
            <span style={{ fontSize: 11, background: 'rgba(245,158,11,0.2)', color: 'var(--amber)', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>
              SLA Exceeded
            </span>
          </div>

          {overdue.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--green)', fontSize: 13 }}>
              <CheckCircle2 size={24} style={{ margin: '0 auto 8px' }} />
              All complaints are within SLA deadlines!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {overdue.map(c => (
                <div key={c.id} style={{
                  padding: '12px 14px', background: 'var(--navy-mid)', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12
                }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Link to={`/complaints/${c.complaint_id}`} style={{ color: 'var(--blue-light)', fontFamily: 'monospace', fontWeight: 600, fontSize: 13 }}>
                        {c.complaint_id}
                      </Link>
                      <span style={{ fontSize: 11, background: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '2px 6px', borderRadius: 6, fontWeight: 600 }}>
                        {c.days_overdue} days overdue
                      </span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--white)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.title}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>
                      Assigned: {c.assigned_to_name || 'Unassigned'} · SLA: {c.sla_days} days
                    </div>
                  </div>

                  <button
                    onClick={() => handleEscalate(c.complaint_id)}
                    disabled={escalatingId === c.complaint_id || c.is_escalated}
                    className="btn btn-secondary btn-sm"
                    style={{ borderColor: 'rgba(239,68,68,0.5)', color: '#ef4444', flexShrink: 0 }}
                  >
                    {escalatingId === c.complaint_id ? <span className="spinner" /> : c.is_escalated ? 'Escalated' : '🚨 Escalate'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. Ward Complaint Spikes Card */}
        <div className="card" style={{ border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, color: 'var(--purple)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={18} /> Ward Spike Alerts ({wardSpikes.length})
            </h3>
            <span style={{ fontSize: 11, background: 'rgba(139,92,246,0.2)', color: 'var(--purple)', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>
              3+ New Complaints in 24h
            </span>
          </div>

          {wardSpikes.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--gray-500)', fontSize: 13 }}>
              No sudden ward complaint spikes detected in the last 24 hours.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {wardSpikes.map(w => (
                <div key={w.ward} style={{
                  padding: '12px 14px', background: 'var(--navy-mid)', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--white)' }}>📍 {w.ward}</div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>High volume activity spike detected</div>
                  </div>
                  <div style={{
                    fontSize: 14, fontWeight: 800, color: 'var(--purple)', background: 'rgba(139,92,246,0.15)',
                    padding: '6px 14px', borderRadius: 20, border: '1px solid rgba(139,92,246,0.3)'
                  }}>
                    🔥 {w.spike_count} complaints / 24h
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. Unassigned 48h+ Backlog Card */}
        <div className="card" style={{ border: '1px solid rgba(20,184,166,0.3)', background: 'rgba(20,184,166,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, color: 'var(--teal-light)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserX size={18} /> Unassigned Backlog &gt; 48h ({unassigned48h.length})
            </h3>
            <span style={{ fontSize: 11, background: 'rgba(20,184,166,0.2)', color: 'var(--teal-light)', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>
              Awaiting Assignment
            </span>
          </div>

          {unassigned48h.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--green)', fontSize: 13 }}>
              <CheckCircle2 size={24} style={{ margin: '0 auto 8px' }} />
              No unassigned complaints older than 48 hours.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {unassigned48h.map(c => (
                <div key={c.id} style={{
                  padding: '12px 14px', background: 'var(--navy-mid)', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12
                }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Link to={`/complaints/${c.complaint_id}`} style={{ color: 'var(--blue-light)', fontFamily: 'monospace', fontWeight: 600, fontSize: 13 }}>
                        {c.complaint_id}
                      </Link>
                      <span className="badge badge-pending">{c.category}</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--white)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.title}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>
                      Filed: {new Date(c.created_at).toLocaleDateString('en-IN')} · Ward: {c.ward || 'General'}
                    </div>
                  </div>

                  <Link to={`/complaints/${c.complaint_id}`} className="btn btn-secondary btn-sm">
                    Assign Now <ArrowRight size={13} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
