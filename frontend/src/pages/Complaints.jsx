import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { complaintsApi } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Search, Filter, PlusCircle, ChevronLeft, ChevronRight, MapPin, ThumbsUp, AlertCircle } from 'lucide-react';

const CATEGORIES = ['Pothole','Streetlight','Garbage','Water Supply','Drainage','Road Damage','Encroachment','Noise','Other'];
const STATUSES = ['Pending','In Progress','Resolved','Rejected'];
const PRIORITIES = ['Low','Medium','High','Critical'];
const CATEGORY_EMOJI = { Pothole:'🕳️', Streetlight:'💡', Garbage:'🗑️', 'Water Supply':'💧', Drainage:'🌊', 'Road Damage':'🚧', Encroachment:'🏗️', Noise:'🔊', Other:'📋' };

function StatusBadge({ status }) {
  const map = { 'Pending':'badge badge-pending', 'In Progress':'badge badge-inprogress', 'Resolved':'badge badge-resolved', 'Rejected':'badge badge-rejected' };
  return <span className={map[status] || 'badge'}>{status}</span>;
}
function PriorityBadge({ priority }) {
  const map = { Critical:'badge-critical', High:'badge-high', Medium:'badge-medium', Low:'badge-low' };
  return <span className={`badge ${map[priority]||'badge-low'}`}>{priority}</span>;
}

export default function Complaints() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', category: '', priority: '', search: '' });
  const [page, setPage] = useState(1);

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10, ...Object.fromEntries(Object.entries(filters).filter(([,v]) => v)) };
      const res = await complaintsApi.list(params);
      setComplaints(res.data.complaints);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { fetchComplaints(); }, [fetchComplaints]);

  const handleFilterChange = (key, val) => {
    setFilters(f => ({ ...f, [key]: val }));
    setPage(1);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Complaints</h1>
          <p className="page-subtitle">{pagination.total} total complaints</p>
        </div>
        {user?.role === 'citizen' && (
          <Link to="/complaints/new" className="btn btn-primary"><PlusCircle size={16} /> File New Complaint</Link>
        )}
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20, padding: '14px 16px' }}>
        <div className="filter-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) repeat(3, 1fr)', gap: 10, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-500)' }} />
            <input placeholder="Search by title, ID, or address..." value={filters.search}
              onChange={e => handleFilterChange('search', e.target.value)}
              style={{ paddingLeft: 34 }} />
          </div>
          <select value={filters.status} onChange={e => handleFilterChange('status', e.target.value)}>
            <option value="">All Status</option>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={filters.category} onChange={e => handleFilterChange('category', e.target.value)}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={filters.priority} onChange={e => handleFilterChange('priority', e.target.value)}>
            <option value="">All Priority</option>
            {PRIORITIES.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" style={{ width: 32, height: 32 }} /></div>
        ) : complaints.length === 0 ? (
          <div className="empty-state">
            <Filter size={36} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
            <h3>No complaints found</h3>
            <p style={{ fontSize: 13 }}>{user?.role === 'citizen' ? 'File your first complaint to get started.' : 'No complaints match the current filters.'}</p>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Priority</th>
                    {user?.role !== 'citizen' && <th>Filed By</th>}
                    <th style={{ textAlign: 'center' }}>
                      <ThumbsUp size={13} style={{ display: 'inline-block', verticalAlign: 'middle' }} />
                    </th>
                    <th>SLA</th>
                    <th>Location</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.map(c => {
                    const isOverdue = c.is_overdue;
                    return (
                      <tr
                        key={c.id}
                        style={{
                          background: isOverdue ? 'rgba(239,68,68,0.05)' : undefined,
                          borderLeft: isOverdue ? '3px solid rgba(239,68,68,0.5)' : undefined,
                        }}
                      >
                        <td>
                          <Link to={`/complaints/${c.complaint_id}`} style={{ color: 'var(--blue-light)', fontFamily: 'monospace', fontSize: 13 }}>
                            {c.complaint_id}
                          </Link>
                        </td>
                        <td>
                          <Link to={`/complaints/${c.complaint_id}`} style={{ color: 'var(--white)', fontWeight: 500, display: 'block', maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {c.title}
                          </Link>
                        </td>
                        <td><span>{CATEGORY_EMOJI[c.category]} {c.category}</span></td>
                        <td><StatusBadge status={c.status} /></td>
                        <td><PriorityBadge priority={c.priority} /></td>
                        {user?.role !== 'citizen' && <td style={{ color: 'var(--gray-300)', fontSize: 13 }}>{c.citizen_name}</td>}
                        {/* Upvote count */}
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            fontSize: 12, color: c.upvote_count > 0 ? 'var(--blue-light)' : 'var(--gray-500)',
                            fontWeight: c.upvote_count > 0 ? 600 : 400,
                          }}>
                            <ThumbsUp size={11} />
                            {c.upvote_count || 0}
                          </span>
                        </td>
                        {/* SLA indicator */}
                        <td>
                          {isOverdue ? (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 10,
                              background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                              border: '1px solid rgba(239,68,68,0.3)',
                              whiteSpace: 'nowrap',
                            }}>
                              <AlertCircle size={10} /> {c.days_overdue}d overdue
                            </span>
                          ) : c.status !== 'Resolved' && c.status !== 'Rejected' ? (
                            <span style={{
                              fontSize: 11, padding: '2px 7px', borderRadius: 10,
                              background: 'rgba(34,197,94,0.08)', color: 'var(--green)',
                              border: '1px solid rgba(34,197,94,0.2)',
                              whiteSpace: 'nowrap',
                            }}>
                              {c.sla_days || 7}d SLA
                            </span>
                          ) : (
                            <span style={{ fontSize: 11, color: 'var(--gray-500)' }}>—</span>
                          )}
                        </td>
                        <td style={{ color: 'var(--gray-300)', fontSize: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <MapPin size={12} /> <span style={{ maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.ward || c.address?.split(',')[0]}</span>
                          </div>
                        </td>
                        <td style={{ color: 'var(--gray-500)', fontSize: 12 }}>{new Date(c.created_at).toLocaleDateString('en-IN')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p-1)} disabled={page <= 1}>
                  <ChevronLeft size={14} />
                </button>
                <span style={{ fontSize: 13, color: 'var(--gray-300)' }}>Page {pagination.page} of {pagination.totalPages}</span>
                <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p+1)} disabled={page >= pagination.totalPages}>
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
