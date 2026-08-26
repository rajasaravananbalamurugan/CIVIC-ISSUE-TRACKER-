import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { complaintsApi } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { MapPin, ThumbsUp, Clock, Filter, MessageSquare, Compass, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

const WARDS = ['Ward 1', 'Ward 2', 'Ward 3', 'Ward 4', 'Ward 5', 'All Wards'];
const CATEGORY_EMOJI = { Pothole:'🕳️', Streetlight:'💡', Garbage:'🗑️', 'Water Supply':'💧', Drainage:'🌊', 'Road Damage':'🚧', Encroachment:'🏗️', Noise:'🔊', Other:'📋' };

export default function NearbyFeed() {
  const { user } = useAuth();
  const [selectedWard, setSelectedWard] = useState(user?.ward || 'Ward 1');
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [upvotingId, setUpvotingId] = useState(null);

  const fetchNearbyFeed = useCallback(async () => {
    setLoading(true);
    try {
      const res = await complaintsApi.nearbyFeed(selectedWard);
      setComplaints(res.data || []);
    } catch (err) {
      toast.error('Failed to load nearby issues feed');
    } finally {
      setLoading(false);
    }
  }, [selectedWard]);

  useEffect(() => {
    fetchNearbyFeed();
  }, [fetchNearbyFeed]);

  const handleUpvote = async (complaintId) => {
    setUpvotingId(complaintId);
    try {
      const res = await complaintsApi.upvote(complaintId);
      toast.success(res.data.upvoted ? '👍 Upvoted!' : 'Upvote removed');
      setComplaints(prev => prev.map(c => {
        if (c.id === complaintId || c.complaint_id === complaintId) {
          return {
            ...c,
            upvote_count: res.data.upvote_count,
            userHasUpvoted: res.data.upvoted
          };
        }
        return c;
      }));
    } catch (err) {
      toast.error('Failed to upvote complaint');
    } finally {
      setUpvotingId(null);
    }
  };

  const getDaysOpen = (createdAt) => {
    const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Filed today';
    return `${diff} day${diff !== 1 ? 's' : ''} open`;
  };

  return (
    <div style={{ maxWidth: 850 }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Compass size={24} color="var(--teal-light)" /> Neighbourhood Notice Board
          </h1>
          <p className="page-subtitle">See active civic issues filed by your neighbours in {selectedWard}</p>
        </div>

        {/* Ward Filter Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={14} color="var(--gray-500)" />
          <select
            value={selectedWard}
            onChange={e => setSelectedWard(e.target.value)}
            style={{ width: 140, fontSize: 13 }}
          >
            {WARDS.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
          <div className="spinner" style={{ width: 36, height: 36 }} />
        </div>
      ) : complaints.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--gray-500)' }}>
          <MapPin size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <h3 style={{ fontSize: 16, color: 'var(--white)', margin: 0 }}>No Open Issues in {selectedWard}</h3>
          <p style={{ fontSize: 13, marginTop: 4 }}>
            Your neighbourhood looks clean! Be the first to report an issue if you see one.
          </p>
          <Link to="/complaints/new" className="btn btn-primary btn-sm" style={{ marginTop: 16 }}>
            File a Complaint →
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {complaints.map(c => (
            <div
              key={c.id}
              className="card"
              style={{
                background: 'var(--navy-card)',
                border: '1px solid var(--border)',
                borderRadius: 14, padding: '18px 20px',
                transition: 'transform 0.15s ease, border-color 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 24 }}>{CATEGORY_EMOJI[c.category] || '📋'}</span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <Link to={`/complaints/${c.complaint_id}`} style={{ color: 'var(--blue-light)', fontFamily: 'monospace', fontWeight: 600, fontSize: 13 }}>
                        {c.complaint_id}
                      </Link>
                      <span className={`badge ${c.status === 'Resolved' ? 'badge-resolved' : c.status === 'In Progress' ? 'badge-inprogress' : 'badge-pending'}`}>
                        {c.status}
                      </span>
                    </div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--white)' }}>
                      {c.title}
                    </h3>
                  </div>
                </div>

                <span className={`badge ${c.priority === 'Critical' ? 'badge-critical' : c.priority === 'High' ? 'badge-high' : 'badge-low'}`}>
                  {c.priority}
                </span>
              </div>

              <p style={{ fontSize: 13, color: 'var(--gray-300)', lineHeight: 1.5, marginBottom: 14 }}>
                {c.description}
              </p>

              {/* Card Footer Actions & Meta */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
                paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, color: 'var(--gray-500)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={12} /> {c.ward || c.address?.split(',')[0]}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={12} /> {getDaysOpen(c.created_at)}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    onClick={() => handleUpvote(c.id)}
                    disabled={upvotingId === c.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
                      borderRadius: 8, border: c.userHasUpvoted ? '1px solid var(--blue)' : '1px solid rgba(255,255,255,0.1)',
                      background: c.userHasUpvoted ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.04)',
                      color: c.userHasUpvoted ? 'var(--blue-light)' : 'var(--gray-300)',
                      cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.15s'
                    }}
                  >
                    <ThumbsUp size={13} />
                    {c.userHasUpvoted ? 'Upvoted' : 'Upvote'} ({c.upvote_count || 0})
                  </button>

                  <Link to={`/complaints/${c.complaint_id}`} className="btn btn-secondary btn-sm" style={{ padding: '6px 12px' }}>
                    Details <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
