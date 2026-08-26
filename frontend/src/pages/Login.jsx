import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MapPin, Mail, Lock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const demoLogin = async (email, password) => {
    setForm({ email, password });
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Demo login successful!');
      navigate('/dashboard');
    } catch (err) {
      setError('Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'var(--navy)' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, var(--blue), var(--teal))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
          }}>
            <MapPin size={26} color="white" />
          </div>
          <h1 style={{ fontFamily: 'Sora', fontSize: 26, fontWeight: 700, color: 'var(--white)' }}>CivicTracker</h1>
          <p style={{ color: 'var(--gray-500)', marginTop: 6, fontSize: 14 }}>Sign in to report and track civic issues</p>
        </div>

        <div className="card" style={{ padding: 28 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: 'var(--red)', fontSize: 14 }}>
                <AlertCircle size={16} /> {error}
              </div>
            )}
            <div className="form-group">
              <label className="form-label"><Mail size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Email</label>
              <input type="email" placeholder="you@example.com" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label"><Lock size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Password</label>
              <input type="password" placeholder="••••••••" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 4 }} disabled={loading}>
              {loading ? <span className="spinner" /> : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: 'center', fontSize: 14, color: 'var(--gray-500)' }}>
            Don't have an account? <Link to="/register">Register here</Link>
          </div>
        </div>

        {/* Demo accounts */}
        <div style={{ marginTop: 20 }}>
          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--gray-500)', marginBottom: 10 }}>DEMO ACCOUNTS</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[
              { label: '👤 Citizen', email: 'raj@example.com', password: 'Citizen@123', color: '#3b82f6' },
              { label: '⚖️ Authority', email: 'north.officer@civic.gov.in', password: 'Auth@123', color: '#14b8a6' },
              { label: '🛡️ Admin', email: 'admin@civic.gov.in', password: 'Admin@123', color: '#8b5cf6' },
            ].map(d => (
              <button key={d.label} onClick={() => demoLogin(d.email, d.password)} disabled={loading}
                style={{
                  padding: '8px 6px', borderRadius: 8, border: `1px solid ${d.color}30`,
                  background: `${d.color}10`, color: d.color, fontSize: 12, fontWeight: 600, cursor: 'pointer'
                }}>
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
