import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MapPin, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const WARDS = ['Ward 1','Ward 2','Ward 3','Ward 4','Ward 5','Ward 6','Ward 7','Ward 8'];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', ward: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    setLoading(true);
    try {
      await register(form);
      toast.success('Account created! Welcome to CivicTracker.');
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'var(--navy)' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, var(--blue), var(--teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <MapPin size={24} color="white" />
          </div>
          <h1 style={{ fontFamily: 'Sora', fontSize: 24, fontWeight: 700 }}>Create Account</h1>
          <p style={{ color: 'var(--gray-500)', marginTop: 6, fontSize: 14 }}>Join thousands of citizens making their city better</p>
        </div>

        <div className="card" style={{ padding: 28 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: 'var(--red)', fontSize: 14 }}>
                <AlertCircle size={16} /> {error}
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input placeholder="Rajasaravanan B" value={form.name} onChange={e => setForm(f=>({...f, name: e.target.value}))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm(f=>({...f, email: e.target.value}))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password *</label>
              <input type="password" placeholder="Min. 6 characters" value={form.password} onChange={e => setForm(f=>({...f, password: e.target.value}))} required />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input placeholder="9876543210" value={form.phone} onChange={e => setForm(f=>({...f, phone: e.target.value}))} />
              </div>
              <div className="form-group">
                <label className="form-label">Ward</label>
                <select value={form.ward} onChange={e => setForm(f=>({...f, ward: e.target.value}))}>
                  <option value="">Select ward</option>
                  {WARDS.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 4 }} disabled={loading}>
              {loading ? <span className="spinner" /> : 'Create Account'}
            </button>
          </form>
          <div style={{ marginTop: 16, textAlign: 'center', fontSize: 14, color: 'var(--gray-500)' }}>
            Already registered? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
