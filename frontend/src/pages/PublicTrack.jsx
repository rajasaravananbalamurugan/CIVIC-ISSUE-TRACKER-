import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { publicApi } from '../utils/api';
import { Search, MapPin, Clock, ShieldCheck, CheckCircle2, ArrowLeft, Building2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PublicTrack() {
  const [searchParams] = useSearchParams();
  const initialId = searchParams.get('id') || '';
  const [inputVal, setInputVal] = useState(initialId);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    const queryId = inputVal.trim();
    if (!queryId) {
      toast.error('Please enter a Complaint ID');
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const res = await publicApi.track(queryId);
      setResult(res.data);
    } catch (err) {
      setResult(null);
      toast.error(err.response?.data?.error || 'Complaint not found');
    } finally {
      setLoading(false);
    }
  };

  const { complaint, history } = result || {};

  // Status Stepper calculation
  const getStepStatus = (stepName) => {
    if (!complaint) return 'upcoming';
    const status = complaint.status;
    if (status === 'Resolved') return 'completed';
    if (status === 'Rejected') return stepName === 'Filed' ? 'completed' : 'rejected';

    if (stepName === 'Filed') return 'completed';
    if (stepName === 'Assigned') return complaint.is_assigned || status === 'In Progress' ? 'completed' : 'upcoming';
    if (stepName === 'In Progress') return status === 'In Progress' ? 'current' : 'upcoming';
    if (stepName === 'Resolved') return 'upcoming';
    return 'upcoming';
  };

  const steps = [
    { name: 'Filed', desc: 'Report submitted' },
    { name: 'Assigned', desc: 'Officer assigned' },
    { name: 'In Progress', desc: 'Field resolution' },
    { name: 'Resolved', desc: 'Issue closed' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)', color: 'var(--white)', padding: '32px 20px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>

        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Building2 size={24} color="var(--blue-light)" />
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--white)' }}>CivicTracker Public Lookup</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Link to="/public" className="btn btn-secondary btn-sm">
              <ArrowLeft size={14} /> Transparency Portal
            </Link>
            <Link to="/login" className="btn btn-primary btn-sm">
              Sign In
            </Link>
          </div>
        </div>

        {/* Search Card */}
        <div className="card" style={{ background: 'var(--navy-card)', padding: '24px 28px', marginBottom: 24, textAlign: 'center' }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: 'var(--white)' }}>
            🔍 Track Complaint Status
          </h1>
          <p style={{ fontSize: 13, color: 'var(--gray-300)', marginBottom: 20 }}>
            Enter any official Complaint ID (e.g. CMP-2026-0001) to verify live status and resolution history.
          </p>

          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, maxWidth: 520, margin: '0 auto' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-500)' }} />
              <input
                type="text"
                placeholder="Enter Complaint ID (e.g. CMP-2026-0001)..."
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                style={{ paddingLeft: 40, height: 44, fontSize: 14, textTransform: 'uppercase' }}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ height: 44, padding: '0 24px' }}>
              {loading ? <span className="spinner" /> : 'Track'}
            </button>
          </form>
        </div>

        {/* Search Results */}
        {searched && !loading && !result && (
          <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: '#ef4444' }}>
            <AlertCircle size={36} style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: 16, margin: 0 }}>No Complaint Found</h3>
            <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 4 }}>
              Please check the ID and try again. Example format: CMP-2026-0001
            </p>
          </div>
        )}

        {result && complaint && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Stepper Status Card */}
            <div className="card" style={{ background: 'var(--navy-card)', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: 'var(--blue-light)' }}>
                    {complaint.complaint_id}
                  </div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, margin: '4px 0 0 0' }}>
                    {complaint.title}
                  </h2>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span className={`badge ${complaint.status === 'Resolved' ? 'badge-resolved' : complaint.status === 'In Progress' ? 'badge-inprogress' : 'badge-pending'}`}>
                    {complaint.status}
                  </span>
                  <span className={`badge ${complaint.priority === 'Critical' ? 'badge-critical' : 'badge-low'}`}>
                    {complaint.priority}
                  </span>
                </div>
              </div>

              {/* Status Stepper */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12,
                padding: '20px 10px', background: 'var(--navy-mid)', borderRadius: 12, marginBottom: 20
              }}>
                {steps.map((step, idx) => {
                  const state = getStepStatus(step.name);
                  const isCompleted = state === 'completed';
                  const isCurrent = state === 'current';

                  return (
                    <div key={step.name} style={{ textAlign: 'center', position: 'relative' }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', margin: '0 auto 8px',
                        background: isCompleted ? 'var(--green)' : isCurrent ? 'var(--blue)' : 'rgba(255,255,255,0.1)',
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: 13, boxShadow: isCurrent ? 'var(--shadow-glow)' : 'none'
                      }}>
                        {isCompleted ? <CheckCircle2 size={16} /> : idx + 1}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: isCurrent ? 700 : 600, color: isCompleted || isCurrent ? 'var(--white)' : 'var(--gray-500)' }}>
                        {step.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 2 }}>
                        {step.desc}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Details Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
                <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: 'var(--gray-500)', textTransform: 'uppercase' }}>Category</div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{complaint.category}</div>
                </div>

                <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: 'var(--gray-500)', textTransform: 'uppercase' }}>Ward / Location</div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{complaint.ward || 'General'}</div>
                </div>

                <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: 'var(--gray-500)', textTransform: 'uppercase' }}>Filed On</div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>
                    {new Date(complaint.created_at).toLocaleDateString('en-IN')}
                  </div>
                </div>

                <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: 'var(--gray-500)', textTransform: 'uppercase' }}>Target SLA</div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{complaint.sla_days} days</div>
                </div>
              </div>

              <div style={{ fontSize: 13, color: 'var(--gray-300)', lineHeight: 1.6, padding: '12px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}>
                <strong>Description:</strong> {complaint.description}
              </div>

              {complaint.resolution_note && (
                <div style={{ marginTop: 14, padding: '12px 14px', background: 'rgba(34,197,94,0.08)', borderRadius: 8, border: '1px solid rgba(34,197,94,0.2)', fontSize: 13, color: 'var(--green)' }}>
                  <strong>✅ Official Resolution Note:</strong> {complaint.resolution_note}
                </div>
              )}
            </div>

            {/* Status History Timeline */}
            <div className="card" style={{ background: 'var(--navy-card)', padding: '20px 24px' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
                📋 Public Status History
              </h3>

              {history.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>No history updates yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {history.map((h, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--blue-light)', marginTop: 6, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)' }}>
                          Status changed to {h.new_status}
                        </div>
                        {h.note && <div style={{ fontSize: 12, color: 'var(--gray-300)', marginTop: 2 }}>{h.note}</div>}
                        <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 2 }}>
                          {new Date(h.created_at).toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
