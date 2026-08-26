import React, { useEffect, useState } from 'react';
import { adminApi } from '../utils/api';
import { Users, PlusCircle, Trash2, Shield, AlertCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';

const ROLE_COLORS = { citizen: '#3b82f6', authority: '#14b8a6', admin: '#8b5cf6' };
const ROLE_ICONS = { citizen: '👤', authority: '⚖️', admin: '🛡️' };
const WARDS = ['Ward 1','Ward 2','Ward 3','Ward 4','Ward 5','Ward 6','Ward 7','Ward 8','All'];

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({ name:'', email:'', password:'', role:'authority', phone:'', ward:'' });
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await adminApi.users();
      setUsers(res.data);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      await adminApi.createUser(newUser);
      toast.success('User created successfully!');
      setShowModal(false);
      setNewUser({ name:'', email:'', password:'', role:'authority', phone:'', ward:'' });
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (userId, userName) => {
    if (!window.confirm(`Delete user "${userName}"? This cannot be undone.`)) return;
    try {
      await adminApi.deleteUser(userId);
      toast.success('User deleted');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed');
    }
  };

  const filtered = users.filter(u => !filter || u.role === filter);
  const counts = { total: users.length, citizen: users.filter(u=>u.role==='citizen').length, authority: users.filter(u=>u.role==='authority').length, admin: users.filter(u=>u.role==='admin').length };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">{counts.total} users across all roles</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <PlusCircle size={16} /> Add User
        </button>
      </div>

      {/* Role filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { val:'', label:`All (${counts.total})` },
          { val:'citizen', label:`Citizens (${counts.citizen})` },
          { val:'authority', label:`Authorities (${counts.authority})` },
          { val:'admin', label:`Admins (${counts.admin})` },
        ].map(({ val, label }) => (
          <button key={val} onClick={() => setFilter(val)}
            style={{ padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer',
              background: filter === val ? 'var(--blue)' : 'rgba(255,255,255,0.06)',
              color: filter === val ? 'white' : 'var(--gray-300)' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Users table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding: 60 }}><div className="spinner" style={{ width:32, height:32 }} /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><Users size={36} style={{ margin: '0 auto 10px', opacity: 0.3 }} /><h3>No users found</h3></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>User</th><th>Role</th><th>Ward</th><th>Complaints</th><th>Joined</th><th>Action</th></tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const roleColor = ROLE_COLORS[u.role] || '#94a3b8';
                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: `${roleColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${roleColor}30` }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: roleColor }}>{u.name.charAt(0)}</span>
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 500 }}>{u.name}</div>
                            <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: `${roleColor}15`, color: roleColor, border: `1px solid ${roleColor}30` }}>
                          {ROLE_ICONS[u.role]} {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                        </span>
                      </td>
                      <td style={{ color: 'var(--gray-300)', fontSize: 13 }}>{u.ward || '—'}</td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--blue-light)' }}>{u.complaint_count || 0}</span>
                      </td>
                      <td style={{ color: 'var(--gray-500)', fontSize: 12 }}>{new Date(u.created_at).toLocaleDateString('en-IN')}</td>
                      <td>
                        {u.role !== 'admin' && (
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u.id, u.name)}>
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create user modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div className="card" style={{ width: '100%', maxWidth: 440, padding: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17 }}>Add New User</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => { setShowModal(false); setError(''); }}>
                <X size={14} />
              </button>
            </div>
            {error && (
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:8, color:'var(--red)', fontSize:14, marginBottom:14 }}>
                <AlertCircle size={16} /> {error}
              </div>
            )}
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input placeholder="Ward Officer Name" value={newUser.name} onChange={e => setNewUser(f=>({...f, name:e.target.value}))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input type="email" placeholder="officer@civic.gov.in" value={newUser.email} onChange={e => setNewUser(f=>({...f, email:e.target.value}))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input type="password" placeholder="Min. 6 characters" value={newUser.password} onChange={e => setNewUser(f=>({...f, password:e.target.value}))} required />
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Role *</label>
                  <select value={newUser.role} onChange={e => setNewUser(f=>({...f, role:e.target.value}))}>
                    <option value="citizen">Citizen</option>
                    <option value="authority">Authority</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Ward</label>
                  <select value={newUser.ward} onChange={e => setNewUser(f=>({...f, ward:e.target.value}))}>
                    <option value="">Select ward</option>
                    {WARDS.map(w => <option key={w}>{w}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input placeholder="9000000000" value={newUser.phone} onChange={e => setNewUser(f=>({...f, phone:e.target.value}))} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setError(''); }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating} style={{ justifyContent: 'center', minWidth: 120 }}>
                  {creating ? <span className="spinner" /> : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
