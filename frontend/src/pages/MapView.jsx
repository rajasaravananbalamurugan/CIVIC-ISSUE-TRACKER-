import React, { useEffect, useState, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { complaintsApi } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Filter, RefreshCw, MapPin, ThumbsUp, Clock, AlertTriangle } from 'lucide-react';

// Status configuration
const STATUS_CONFIG = {
  'Pending':     { color: '#ef4444', fillColor: '#ef4444', label: '🔴 Pending' },
  'In Progress': { color: '#3b82f6', fillColor: '#3b82f6', label: '🔵 In Progress' },
  'Resolved':    { color: '#22c55e', fillColor: '#22c55e', label: '🟢 Resolved' },
  'Rejected':    { color: '#6b7280', fillColor: '#6b7280', label: '⚫ Rejected' },
};

const CATEGORY_EMOJI = {
  Pothole: '🕳️', Streetlight: '💡', Garbage: '🗑️', 'Water Supply': '💧',
  Drainage: '🌊', 'Road Damage': '🚧', Encroachment: '🏗️', Noise: '🔊', Other: '📋'
};

const CATEGORIES = ['Pothole','Streetlight','Garbage','Water Supply','Drainage','Road Damage','Encroachment','Noise','Other'];
const STATUSES = ['Pending','In Progress','Resolved','Rejected'];

function MapBoundsUpdater({ complaints }) {
  const map = useMap();
  useEffect(() => {
    if (complaints.length === 0) return;
    const bounds = complaints
      .filter(c => c.latitude && c.longitude)
      .map(c => [c.latitude, c.longitude]);
    if (bounds.length > 0) {
      try { map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 }); } catch (_) {}
    }
  }, [complaints, map]);
  return null;
}

export default function MapView() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', category: '' });
  const [selected, setSelected] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.category) params.category = filters.category;
      const res = await complaintsApi.mapData(params);
      setComplaints(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const statusCounts = {};
  complaints.forEach(c => { statusCounts[c.status] = (statusCounts[c.status] || 0) + 1; });
  const overdueCount = complaints.filter(c => c.is_overdue).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🗺️ Live Map View</h1>
          <p className="page-subtitle">
            {loading ? 'Loading...' : `${complaints.length} complaints on map${overdueCount > 0 ? ` · ${overdueCount} overdue` : ''}`}
          </p>
        </div>
        <button onClick={fetchData} className="btn btn-secondary" disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filter bar */}
      <div className="card" style={{ padding: '12px 16px', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Filter size={14} color="var(--gray-500)" />
          <select
            value={filters.status}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
            style={{ minWidth: 130 }}
          >
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <select
            value={filters.category}
            onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
            style={{ minWidth: 140 }}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          {(filters.status || filters.category) && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setFilters({ status: '', category: '' })}
            >
              Clear filters
            </button>
          )}

          {/* Status summary pills */}
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
            {Object.entries(STATUS_CONFIG).map(([st, cfg]) => (
              statusCounts[st] ? (
                <span key={st} style={{
                  fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                  background: `${cfg.color}18`, color: cfg.color,
                  border: `1px solid ${cfg.color}40`,
                }}>
                  {cfg.label} · {statusCounts[st]}
                </span>
              ) : null
            ))}
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
        {loading && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 500,
            background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 12px' }} />
              <div style={{ fontSize: 14, color: 'var(--gray-300)' }}>Loading map data...</div>
            </div>
          </div>
        )}

        <MapContainer
          center={[13.0827, 80.2707]}
          zoom={12}
          style={{ height: '60vh', minHeight: 420, width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {complaints.length > 0 && <MapBoundsUpdater complaints={complaints} />}

          {complaints.map(c => {
            const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG['Pending'];
            const isOverdue = c.is_overdue;
            return (
              <CircleMarker
                key={c.id}
                center={[c.latitude, c.longitude]}
                radius={isOverdue ? 12 : 9}
                pathOptions={{
                  color: isOverdue ? '#f59e0b' : cfg.color,
                  fillColor: cfg.fillColor,
                  fillOpacity: 0.85,
                  weight: isOverdue ? 3 : 2,
                  dashArray: isOverdue ? '4 2' : undefined,
                }}
                eventHandlers={{ click: () => setSelected(c) }}
              >
                <Popup maxWidth={280}>
                  <div style={{ fontFamily: 'inherit', minWidth: 220 }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#60a5fa', marginBottom: 4 }}>
                      {c.complaint_id}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, lineHeight: 1.3 }}>
                      {CATEGORY_EMOJI[c.category] || '📋'} {c.title}
                    </div>

                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 12,
                        background: `${cfg.color}25`, color: cfg.color, border: `1px solid ${cfg.color}50`,
                      }}>{c.status}</span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: '#1e293b', color: '#94a3b8' }}>
                        {c.category}
                      </span>
                      {isOverdue && (
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 12,
                          background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
                          border: '1px solid rgba(245,158,11,0.4)',
                        }}>
                          ⏱️ {c.days_overdue}d overdue
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                      📍 {c.address}
                    </div>
                    {c.upvote_count > 0 && (
                      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>
                        👍 {c.upvote_count} upvotes
                      </div>
                    )}
                    <a
                      href={`/complaints/${c.complaint_id}`}
                      style={{ fontSize: 12, color: '#60a5fa', textDecoration: 'none', fontWeight: 600 }}
                    >
                      View Details →
                    </a>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>

        {/* Map legend overlay */}
        <div style={{
          position: 'absolute', bottom: 24, left: 12, zIndex: 400,
          background: 'rgba(15,23,42,0.92)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 10, padding: '10px 14px',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Legend
          </div>
          {Object.entries(STATUS_CONFIG).map(([st, cfg]) => (
            <div key={st} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#cbd5e1' }}>{st}</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px dashed #f59e0b', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: '#f59e0b' }}>SLA Overdue</span>
          </div>
        </div>

        {/* No complaints message */}
        {!loading && complaints.length === 0 && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            zIndex: 400, textAlign: 'center',
            background: 'rgba(15,23,42,0.9)', borderRadius: 12, padding: '24px 32px',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <MapPin size={32} color="var(--gray-500)" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--white)', marginBottom: 4 }}>
              No complaints on map
            </div>
            <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>
              {user?.role === 'citizen' ? 'Your complaints need coordinates to appear here.' : 'No complaints with location data found.'}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .leaflet-popup-content-wrapper {
          background: #1e293b !important;
          color: #e2e8f0 !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          border-radius: 10px !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5) !important;
        }
        .leaflet-popup-tip { background: #1e293b !important; }
        .leaflet-popup-close-button { color: #94a3b8 !important; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
