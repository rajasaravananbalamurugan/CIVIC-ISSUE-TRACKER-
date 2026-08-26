import React, { useEffect, useState, useCallback } from 'react';
import { announcementsApi } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Megaphone, Plus, Trash2, Calendar, MapPin, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Announcements() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showExpired, setShowExpired] = useState(false);

  // Admin form state
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', ward: 'All Wards', priority: 'Medium', expires_at: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await announcementsApi.getAll(showExpired);
      setAnnouncements(res.data || []);
    } catch (err) {
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }, [showExpired]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title || !form.message) {
      toast.error('Title and message are required');
      return;
    }

    setSubmitting(true);
    try {
      await announcementsApi.create(form);
      toast.success('📢 Announcement posted!');
      setForm({ title: '', message: '', ward: 'All Wards', priority: 'Medium', expires_at: '' });
      setShowForm(false);
      fetchAnnouncements();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to post announcement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await announcementsApi.delete(id);
      toast.success('Announcement deleted');
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      toast.error('Failed to delete announcement');
    }
  };

  const isExpired = (expiresAt) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) <= new Date();
  };

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Megaphone size={24} color="var(--amber)" /> Public Announcements Board
          </h1>
          <p className="page-subtitle">Official city updates, emergency notices & ward broadcasts</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {user?.role === 'admin' && (
            <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
              <Plus size={16} /> {showForm ? 'Cancel' : 'Post Announcement'}
            </button>
          )}

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowExpired(!showExpired)}
          >
            {showExpired ? 'Hide Expired' : 'Show Expired'}
          </button>
        </div>
      </div>

      {/* Admin Create Form */}
      {showForm && user?.role === 'admin' && (
        <div className="card" style={{ marginBottom: 24, border: '1px solid var(--blue)', background: 'var(--navy-card)' }}>
          <h3 style={{ fontSize: 16, margin: '0 0 16px 0', color: 'var(--blue-light)' }}>
            📢 Post New City Announcement
          </h3>

          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Announcement Title *</label>
              <input
                type="text"
                placeholder="e.g. Scheduled Water Pipeline Maintenance in Ward 2"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Target Ward</label>
                <select value={form.ward} onChange={e => setForm(f => ({ ...f, ward: e.target.value }))}>
                  <option value="All Wards">All Wards (City Wide)</option>
                  <option value="Ward 1">Ward 1</option>
                  <option value="Ward 2">Ward 2</option>
                  <option value="Ward 3">Ward 3</option>
                  <option value="Ward 4">Ward 4</option>
                  <option value="Ward 5">Ward 5</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Priority Level</label>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                  <option value="Low">Low (Informational)</option>
                  <option value="Medium">Medium (General)</option>
                  <option value="High">High (Important)</option>
                  <option value="Critical">Critical (Emergency)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Expiry Date (Optional)</label>
                <input
                  type="date"
                  value={form.expires_at}
                  onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Announcement Details *</label>
              <textarea
                rows={3}
                placeholder="Provide complete details about the event, advisory, or scheduled maintenance..."
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-success" disabled={submitting}>
                {submitting ? <span className="spinner" /> : 'Publish Announcement'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Announcements List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
          <div className="spinner" style={{ width: 36, height: 36 }} />
        </div>
      ) : announcements.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--gray-500)' }}>
          <Megaphone size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <h3 style={{ fontSize: 16, color: 'var(--white)', margin: 0 }}>No Announcements</h3>
          <p style={{ fontSize: 13, marginTop: 4 }}>
            There are currently no active public announcements for your area.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {announcements.map(a => {
            const expired = isExpired(a.expires_at);
            const isCritical = a.priority === 'Critical';

            return (
              <div
                key={a.id}
                className="card"
                style={{
                  background: isCritical ? 'rgba(239,68,68,0.05)' : 'var(--navy-card)',
                  border: isCritical ? '1px solid rgba(239,68,68,0.3)' : '1px solid var(--border)',
                  borderRadius: 14, padding: '18px 20px',
                  opacity: expired ? 0.6 : 1
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span className={`badge ${a.priority === 'Critical' ? 'badge-critical' : a.priority === 'High' ? 'badge-high' : 'badge-medium'}`}>
                        {a.priority}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--teal-light)', fontWeight: 600 }}>
                        📍 {a.ward}
                      </span>
                      {expired && (
                        <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.1)', color: 'var(--gray-500)', padding: '1px 6px', borderRadius: 4 }}>
                          EXPIRED
                        </span>
                      )}
                    </div>

                    <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: 'var(--white)' }}>
                      {a.title}
                    </h3>
                  </div>

                  {user?.role === 'admin' && (
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="btn btn-secondary btn-sm"
                      style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)', padding: '4px 8px' }}
                      title="Delete Announcement"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                <p style={{ fontSize: 14, color: 'var(--gray-100)', lineHeight: 1.6, marginBottom: 12 }}>
                  {a.message}
                </p>

                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  fontSize: 12, color: 'var(--gray-500)', paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.04)'
                }}>
                  <span>Posted by <strong>{a.author_name}</strong> · {new Date(a.created_at).toLocaleDateString('en-IN')}</span>
                  {a.expires_at && (
                    <span>Expires: {new Date(a.expires_at).toLocaleDateString('en-IN')}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
