import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { publicApi } from '../utils/api';
import { Building2, Share2, CheckCircle2, FileText, Award, ArrowUpRight, Search, Shield, Activity, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PublicTransparency() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    publicApi.transparency()
      .then(res => setData(res.data))
      .catch(() => toast.error('Failed to load transparency portal data'))
      .finally(() => setLoading(false));
  }, []);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success('🔗 Transparency Portal link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--white)' }}>
        <div className="spinner" style={{ width: 36, height: 36 }} />
      </div>
    );
  }

  if (!data) return null;

  const { totalComplaints, resolvedCount, inProgressCount, pendingCount, resolutionRate, topCategories, wardLeaderboard, recentlyResolved } = data;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)', color: 'var(--white)', padding: '32px 20px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Government Portal Top Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingBottom: 24, marginBottom: 28, borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: 'linear-gradient(135deg, var(--blue), var(--teal))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'var(--shadow-glow)'
            }}>
              <Building2 size={26} color="white" />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal-light)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Official City Governance Portal
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: 'var(--white)' }}>
                Civic Transparency Dashboard
              </h1>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={handleShare} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Share2 size={16} /> Share Portal
            </button>
            <Link to="/track" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Search size={16} /> Track Complaint
            </Link>
            <Link to="/login" className="btn btn-secondary">
              Sign In →
            </Link>
          </div>
        </div>

        {/* City Stats Overview Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
          <div className="card" style={{ background: 'var(--navy-card)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: 6 }}>Total Filed Issues</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--blue-light)' }}>{totalComplaints}</div>
            <div style={{ fontSize: 12, color: 'var(--gray-300)', marginTop: 4 }}>City-wide citizen reports</div>
          </div>

          <div className="card" style={{ background: 'var(--navy-card)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: 6 }}>Resolution Rate</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--green)' }}>{resolutionRate}%</div>
            <div style={{ fontSize: 12, color: 'var(--gray-300)', marginTop: 4 }}>{resolvedCount} of {totalComplaints} resolved</div>
          </div>

          <div className="card" style={{ background: 'var(--navy-card)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: 6 }}>Active In Progress</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--blue)' }}>{inProgressCount}</div>
            <div style={{ fontSize: 12, color: 'var(--gray-300)', marginTop: 4 }}>Under active resolution</div>
          </div>

          <div className="card" style={{ background: 'var(--navy-card)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: 6 }}>Pending Review</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--amber)' }}>{pendingCount}</div>
            <div style={{ fontSize: 12, color: 'var(--gray-300)', marginTop: 4 }}>Awaiting officer triage</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>

          {/* Top Reported Categories */}
          <div className="card" style={{ background: 'var(--navy-card)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={18} color="var(--teal-light)" /> Top 3 Reported Issue Types
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {topCategories.map((cat, idx) => (
                <div key={cat.category} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--navy-mid)', borderRadius: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--teal-light)' }}>
                      #{idx + 1}
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>{cat.category}</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--white)' }}>
                    {cat.count} reports
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ward Resolution Leaderboard */}
          <div className="card" style={{ background: 'var(--navy-card)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Award size={18} color="var(--amber)" /> Ward Resolution Leaderboard
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {wardLeaderboard.slice(0, 4).map((w, idx) => (
                <div key={w.ward} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--navy-mid)', borderRadius: 8 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>📍 {w.ward}</div>
                    <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>{w.resolved} of {w.total} resolved</div>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--green)' }}>
                    {w.rate}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 5 Most Recently Resolved Complaints */}
        <div className="card" style={{ background: 'var(--navy-card)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={18} color="var(--green)" /> Recently Resolved Civic Issues
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recentlyResolved.map(r => (
              <div key={r.complaint_id} style={{
                padding: '14px 16px', background: 'var(--navy-mid)', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: 'var(--blue-light)' }}>
                      {r.complaint_id}
                    </span>
                    <span className="badge badge-resolved">Resolved</span>
                    <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>📍 {r.ward}</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--gray-500)' }}>
                    {new Date(r.resolved_at).toLocaleDateString('en-IN')}
                  </span>
                </div>

                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--white)', marginBottom: 6 }}>
                  {r.title}
                </div>

                {r.resolution_note && (
                  <div style={{ fontSize: 13, color: 'var(--green)', background: 'rgba(34,197,94,0.08)', padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(34,197,94,0.2)' }}>
                    <strong>Action Taken:</strong> {r.resolution_note}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 40, paddingTop: 20, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--gray-500)' }}>
          CivicTracker Public Transparency Portal · Verified Government Data
        </div>

      </div>
    </div>
  );
}
