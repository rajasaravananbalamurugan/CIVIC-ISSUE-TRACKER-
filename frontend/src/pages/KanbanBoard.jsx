import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { complaintsApi } from '../utils/api';
import { LayoutGrid, Clock, AlertTriangle, CheckCircle2, XCircle, User, MapPin, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const COLUMNS = [
  { id: 'Pending', label: 'Pending', icon: Clock, color: 'var(--amber)', bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.2)' },
  { id: 'In Progress', label: 'In Progress', icon: AlertTriangle, color: 'var(--blue-light)', bg: 'rgba(59,130,246,0.06)', border: 'rgba(59,130,246,0.2)' },
  { id: 'Resolved', label: 'Resolved', icon: CheckCircle2, color: 'var(--green)', bg: 'rgba(34,197,94,0.06)', border: 'rgba(34,197,94,0.2)' },
  { id: 'Rejected', label: 'Rejected', icon: XCircle, color: '#ef4444', bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.2)' },
];

const CATEGORY_EMOJI = { Pothole:'🕳️', Streetlight:'💡', Garbage:'🗑️', 'Water Supply':'💧', Drainage:'🌊', 'Road Damage':'🚧', Encroachment:'🏗️', Noise:'🔊', Other:'📋' };

export default function KanbanBoard() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [search, setSearch] = useState('');

  const fetchKanbanComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const res = await complaintsApi.list({ limit: 100 });
      setComplaints(res.data.complaints || []);
    } catch (err) {
      toast.error('Failed to load Kanban board');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKanbanComplaints();
  }, [fetchKanbanComplaints]);

  // HTML5 Drag and Drop handlers
  const handleDragStart = (e, complaint) => {
    setDraggedItem(complaint);
    e.dataTransfer.setData('text/plain', complaint.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, colId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCol !== colId) {
      setDragOverCol(colId);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    setDragOverCol(null);

    if (!draggedItem) return;
    if (draggedItem.status === targetStatus) {
      setDraggedItem(null);
      return;
    }

    const previousStatus = draggedItem.status;

    // Optimistic UI update
    setComplaints(prev => prev.map(c => c.id === draggedItem.id ? { ...c, status: targetStatus } : c));
    toast.success(`Moved ${draggedItem.complaint_id} to ${targetStatus}`);

    try {
      await complaintsApi.updateStatus(draggedItem.id, {
        status: targetStatus,
        note: `Moved on Kanban board to ${targetStatus}`
      });
    } catch (err) {
      // Rollback on failure
      setComplaints(prev => prev.map(c => c.id === draggedItem.id ? { ...c, status: previousStatus } : c));
      toast.error(err.response?.data?.error || 'Failed to update status');
    } finally {
      setDraggedItem(null);
    }
  };

  const filteredComplaints = complaints.filter(c => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return c.complaint_id.toLowerCase().includes(s) ||
           c.title.toLowerCase().includes(s) ||
           (c.citizen_name && c.citizen_name.toLowerCase().includes(s)) ||
           (c.ward && c.ward.toLowerCase().includes(s));
  });

  return (
    <div style={{ maxWidth: 1200 }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <LayoutGrid size={24} color="var(--teal-light)" /> Kanban Board
          </h1>
          <p className="page-subtitle">Drag and drop complaints across workflow columns to update resolution status</p>
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', width: 260 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-500)' }} />
          <input
            placeholder="Search Kanban board..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 34, fontSize: 13 }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 350 }}>
          <div className="spinner" style={{ width: 36, height: 36 }} />
        </div>
      ) : (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16,
          alignItems: 'start', minHeight: 600, overflowX: 'auto', paddingBottom: 16
        }}>
          {COLUMNS.map(col => {
            const ColIcon = col.icon;
            const colComplaints = filteredComplaints.filter(c => c.status === col.id);
            const isTarget = dragOverCol === col.id;

            return (
              <div
                key={col.id}
                onDragOver={e => handleDragOver(e, col.id)}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, col.id)}
                style={{
                  background: isTarget ? `${col.color}15` : 'var(--navy-card)',
                  borderRadius: 14,
                  border: isTarget ? `2px dashed ${col.color}` : '1px solid var(--border)',
                  padding: 14,
                  transition: 'all 0.2s ease',
                  minHeight: 520,
                  display: 'flex', flexDirection: 'column'
                }}
              >
                {/* Column Header */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--border)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ColIcon size={16} color={col.color} />
                    <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--white)' }}>
                      {col.label}
                    </h3>
                  </div>

                  <span style={{
                    fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 12,
                    background: `${col.color}20`, color: col.color, border: `1px solid ${col.color}40`
                  }}>
                    {colComplaints.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {colComplaints.length === 0 ? (
                    <div style={{
                      padding: '36px 12px', textAlign: 'center', color: 'var(--gray-500)', fontSize: 12,
                      border: '1px dashed rgba(255,255,255,0.06)', borderRadius: 10
                    }}>
                      Drop complaints here
                    </div>
                  ) : (
                    colComplaints.map(c => {
                      const isBeingDragged = draggedItem?.id === c.id;
                      return (
                        <div
                          key={c.id}
                          draggable
                          onDragStart={e => handleDragStart(e, c)}
                          style={{
                            padding: '12px 14px', background: 'var(--navy-mid)', borderRadius: 10,
                            border: '1px solid rgba(255,255,255,0.08)',
                            boxShadow: 'var(--shadow)',
                            cursor: 'grab', opacity: isBeingDragged ? 0.4 : 1,
                            transition: 'all 0.15s ease',
                            userSelect: 'none'
                          }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = col.color}
                          onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <Link to={`/complaints/${c.complaint_id}`} style={{ color: 'var(--blue-light)', fontFamily: 'monospace', fontWeight: 600, fontSize: 12 }} onClick={e => e.stopPropagation()}>
                              {c.complaint_id}
                            </Link>
                            <span className={`badge ${c.priority === 'Critical' ? 'badge-critical' : c.priority === 'High' ? 'badge-high' : c.priority === 'Medium' ? 'badge-medium' : 'badge-low'}`}>
                              {c.priority}
                            </span>
                          </div>

                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)', marginBottom: 8, lineHeight: 1.3 }}>
                            {CATEGORY_EMOJI[c.category] || '📋'} {c.title}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--gray-500)', paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <User size={11} /> {c.citizen_name}
                            </span>
                            {c.ward && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                <MapPin size={11} /> {c.ward}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
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
