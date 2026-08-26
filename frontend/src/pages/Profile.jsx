import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../utils/api';
import { User, Lock, Phone, MapPin, CheckCircle, Bell, Mail, Smartphone, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const WARDS = ['Ward 1','Ward 2','Ward 3','Ward 4','Ward 5','Ward 6','Ward 7','Ward 8'];
const ROLE_COLORS = { citizen: '#3b82f6', authority: '#14b8a6', admin: '#8b5cf6' };
const ROLE_LABELS = { citizen: '👤 Citizen', authority: '⚖️ Ward Authority', admin: '🛡️ System Admin' };

function getNextSundayDate() {
  const d = new Date();
  const daysUntilSunday = (7 - d.getDay()) % 7 || 7;
  d.setDate(d.getDate() + daysUntilSunday);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    ward: user?.ward || '',
    sms_enabled: user?.sms_enabled !== undefined ? !!user.sms_enabled : true,
    digest_enabled: user?.digest_enabled !== undefined ? !!user.digest_enabled : true,
  });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [changing, setChanging] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await authApi.updateProfile(form);
      updateUser(res.data.user);
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (pwForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setChanging(true);
    try {
      await authApi.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password changed successfully!');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Password change failed');
    } finally {
      setChanging(false);
    }
  };

  const roleColor = ROLE_COLORS[user?.role] || '#64748b';
  const hasPhone = Boolean(form.phone && form.phone.trim());
  const isSmsActive = hasPhone && form.sms_enabled;
  const nextDigestDate = getNextSundayDate();

  return (
    <div style={{ maxWidth: 620 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Profile & Preferences</h1>
          <p className="page-subtitle">Manage your account, SMS alerts, and email digest settings</p>
        </div>
      </div>

      {/* Profile summary card */}
      <div className="card" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: `${roleColor}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${roleColor}50`, flexShrink: 0 }}>
            <span style={{ fontFamily: 'Sora', fontSize: 24, fontWeight: 700, color: roleColor }}>{user?.name?.charAt(0)}</span>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{user?.name}</div>
            <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>{user?.email}</div>
            <div style={{ marginTop: 4 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: `${roleColor}15`, color: roleColor, border: `1px solid ${roleColor}30` }}>
                {ROLE_LABELS[user?.role]}
              </span>
            </div>
          </div>
        </div>

        {/* Feature 6 SMS Badge indicator */}
        {user?.role === 'citizen' && (
          <div>
            {isSmsActive ? (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                background: 'rgba(34,197,94,0.12)', color: 'var(--green)',
                border: '1px solid rgba(34,197,94,0.3)'
              }}>
                <Smartphone size={14} /> SMS Alerts Active
              </span>
            ) : (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                background: 'rgba(245,158,11,0.12)', color: 'var(--amber)',
                border: '1px solid rgba(245,158,11,0.3)'
              }}>
                <AlertTriangle size={14} /> Add phone number to enable SMS alerts
              </span>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, background: 'var(--navy-card)', borderRadius: 10, padding: 4, border: '1px solid rgba(255,255,255,0.06)' }}>
        {[
          { id: 'profile', label: '👤 Edit Profile', icon: User },
          { id: 'password', label: '🔒 Change Password', icon: Lock },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ flex: 1, padding: '9px 16px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
              background: activeTab === t.id ? 'var(--blue)' : 'transparent',
              color: activeTab === t.id ? 'white' : 'var(--gray-300)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && (
        <div className="card">
          <form onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="form-group">
              <label className="form-label"><User size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Full Name</label>
              <input value={form.name} onChange={e => setForm(f=>({...f, name:e.target.value}))} placeholder="Your full name" required />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input value={user?.email} readOnly style={{ opacity: 0.5, cursor: 'not-allowed' }} />
              <span style={{ fontSize: 11, color: 'var(--gray-500)' }}>Email cannot be changed</span>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">
                  <Phone size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Phone Number
                </label>
                <input value={form.phone} onChange={e => setForm(f=>({...f, phone:e.target.value}))} placeholder="e.g. 9876543210" />
                {/* Feature 6 Label */}
                <span style={{ fontSize: 11, color: 'var(--blue-light)', marginTop: 2, display: 'block' }}>
                  📱 Used for SMS status alerts
                </span>
              </div>

              <div className="form-group">
                <label className="form-label"><MapPin size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Ward</label>
                <select value={form.ward} onChange={e => setForm(f=>({...f, ward:e.target.value}))}>
                  <option value="">Select ward</option>
                  {WARDS.map(w => <option key={w}>{w}</option>)}
                </select>
              </div>
            </div>

            {/* 📱 Feature 6 & 📰 Feature 7 Notifications & Digest Checkboxes */}
            {user?.role === 'citizen' && (
              <div style={{
                background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 14
              }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--white)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Bell size={15} color="var(--amber)" /> Notification Preferences
                </h4>

                {/* Feature 6: SMS Checkbox */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: 'var(--gray-100)' }}>
                  <input
                    type="checkbox"
                    checked={form.sms_enabled}
                    onChange={e => setForm(f => ({ ...f, sms_enabled: e.target.checked }))}
                    style={{ width: 16, height: 16, accentColor: 'var(--blue)' }}
                  />
                  <span>Receive SMS notifications when complaint status changes</span>
                </label>

                {/* Feature 7: Digest Checkbox & Next Schedule */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: 'var(--gray-100)' }}>
                    <input
                      type="checkbox"
                      checked={form.digest_enabled}
                      onChange={e => setForm(f => ({ ...f, digest_enabled: e.target.checked }))}
                      style={{ width: 16, height: 16, accentColor: 'var(--blue)' }}
                    />
                    <span>📰 Receive weekly ward digest emails</span>
                  </label>
                  {form.digest_enabled && (
                    <div style={{ fontSize: 12, color: 'var(--teal-light)', marginLeft: 26, fontStyle: 'italic' }}>
                      Next digest: Sunday, {nextDigestDate}
                    </div>
                  )}
                </div>
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={saving} style={{ justifyContent: 'center', marginTop: 4 }}>
              {saving ? <span className="spinner" /> : <><CheckCircle size={15} /> Save Changes</>}
            </button>
          </form>

          {/* Account info */}
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 8, letterSpacing: '0.05em' }}>ACCOUNT INFO</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Member since', value: user?.created_at ? new Date(user.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—' },
                { label: 'Account type', value: user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1) },
              ].map(item => (
                <div key={item.label} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: 'var(--gray-500)', marginBottom: 2 }}>{item.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'password' && (
        <div className="card">
          <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input type="password" value={pwForm.currentPassword} onChange={e => setPwForm(f=>({...f, currentPassword:e.target.value}))} placeholder="Your current password" required />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input type="password" value={pwForm.newPassword} onChange={e => setPwForm(f=>({...f, newPassword:e.target.value}))} placeholder="Min. 6 characters" required />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input type="password" value={pwForm.confirmPassword} onChange={e => setPwForm(f=>({...f, confirmPassword:e.target.value}))} placeholder="Repeat new password" required />
            </div>
            <button type="submit" className="btn btn-primary" disabled={changing} style={{ justifyContent: 'center' }}>
              {changing ? <span className="spinner" /> : <><Lock size={15} /> Change Password</>}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
