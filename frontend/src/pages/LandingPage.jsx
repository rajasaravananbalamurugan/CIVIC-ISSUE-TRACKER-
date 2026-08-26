import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, CheckCircle, Clock, Users, FileText, ArrowRight, Shield, Star, Zap } from 'lucide-react';

const FEATURES = [
  {
    icon: FileText,
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.1)',
    title: 'Report Issues Instantly',
    desc: 'File complaints with photo evidence, GPS location, and category — all in under 60 seconds.',
  },
  {
    icon: MapPin,
    color: '#14b8a6',
    bg: 'rgba(20,184,166,0.1)',
    title: 'Pinpoint on Live Map',
    desc: 'Drop a pin on an interactive map to precisely geo-tag the problem location in your ward.',
  },
  {
    icon: Clock,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.1)',
    title: 'Real-Time Status Tracking',
    desc: 'Follow every status change — Pending → In Progress → Resolved — with a full audit trail.',
  },
  {
    icon: Shield,
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.1)',
    title: 'Authority Dashboard',
    desc: 'Ward officers get a single command center to manage, assign, and resolve complaints.',
  },
  {
    icon: Users,
    color: '#ec4899',
    bg: 'rgba(236,72,153,0.1)',
    title: 'Community Comments',
    desc: 'Citizens and authorities can communicate directly on each complaint thread.',
  },
  {
    icon: Star,
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.1)',
    title: 'Analytics & Insights',
    desc: 'Admins and authorities see category breakdowns, resolution rates, and monthly trends.',
  },
];

const ROLES = [
  {
    icon: '👤',
    color: '#3b82f6',
    role: 'Citizen',
    desc: 'Report civic issues in your neighbourhood with evidence and location. Track your complaints from filing to resolution.',
    actions: ['File complaints', 'Track status', 'Add comments', 'View history'],
  },
  {
    icon: '⚖️',
    color: '#14b8a6',
    role: 'Authority',
    desc: 'Ward officers get a unified inbox to manage all complaints, assign staff, and update resolution status.',
    actions: ['View all complaints', 'Update status', 'Assign officers', 'Analytics access'],
  },
  {
    icon: '🛡️',
    color: '#8b5cf6',
    role: 'Admin',
    desc: 'System administrators manage users, authorities, and have full oversight across all wards.',
    actions: ['User management', 'Create authorities', 'Full analytics', 'System oversight'],
  },
];

function AnimatedCounter({ target, suffix = '' }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const duration = 1800;
    const steps = 50;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target]);
  return <>{count.toLocaleString()}{suffix}</>;
}

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)', overflowX: 'hidden' }}>

      {/* ── Navbar ───────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(15,23,41,0.85)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg, var(--blue), var(--teal))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MapPin size={17} color="white" />
            </div>
            <span style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 17, color: 'var(--white)' }}>CivicTracker</span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Link to="/login" className="btn btn-secondary btn-sm">Sign In</Link>
            <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section style={{ position: 'relative', padding: '80px 24px 100px', textAlign: 'center', overflow: 'hidden' }}>
        {/* Background glow blobs */}
        <div style={{ position: 'absolute', top: -100, left: '20%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 0, right: '15%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(13,148,136,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative' }}>
          {/* Badge */}
          <div className="anim-fade-up" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 20, background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.3)', color: 'var(--blue-glow)', fontSize: 13, fontWeight: 600, marginBottom: 24 }}>
            <Zap size={12} fill="currentColor" /> Smart Civic Issue Tracking
          </div>

          <h1 className="anim-fade-up anim-delay-1" style={{ fontFamily: 'Sora', fontSize: 'clamp(32px, 6vw, 58px)', fontWeight: 700, lineHeight: 1.15, color: 'var(--white)', marginBottom: 20 }}>
            Report. Track.<br />
            <span style={{ background: 'linear-gradient(90deg, var(--blue-glow), var(--teal-light))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Resolve Together.
            </span>
          </h1>

          <p className="anim-fade-up anim-delay-2" style={{ fontSize: 18, color: 'var(--gray-300)', lineHeight: 1.7, marginBottom: 36, maxWidth: 560, margin: '0 auto 36px' }}>
            A citizen-first platform to report potholes, streetlights, garbage, and more — with photo evidence and GPS pinning. Authorities resolve. Citizens track.
          </p>

          <div className="anim-fade-up anim-delay-3" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 48 }}>
            <Link to="/register" className="btn btn-primary" style={{ fontSize: 15, padding: '12px 28px', justifyContent: 'center' }}>
              Start Reporting <ArrowRight size={16} />
            </Link>
            <Link to="/login" className="btn btn-secondary" style={{ fontSize: 15, padding: '12px 28px' }}>
              Sign In
            </Link>
          </div>

          {/* Demo accounts hint */}
          <div className="anim-fade-up anim-delay-4" style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              { label: '👤 Citizen Demo', email: 'raj@example.com', pw: 'Citizen@123', color: '#3b82f6' },
              { label: '⚖️ Authority Demo', email: 'north.officer@civic.gov.in', pw: 'Auth@123', color: '#14b8a6' },
              { label: '🛡️ Admin Demo', email: 'admin@civic.gov.in', pw: 'Admin@123', color: '#8b5cf6' },
            ].map(d => (
              <Link key={d.label} to="/login" style={{ padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: `${d.color}12`, border: `1px solid ${d.color}35`, color: d.color, textDecoration: 'none' }}>
                {d.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats strip ──────────────────────────────────────── */}
      <section style={{ background: 'var(--navy-mid)', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '32px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 0, textAlign: 'center' }}>
          {[
            { value: 500, suffix: '+', label: 'Issues Reported' },
            { value: 94, suffix: '%', label: 'Resolution Rate' },
            { value: 8, suffix: '', label: 'City Wards Covered' },
            { value: 3, suffix: '', label: 'User Roles' },
          ].map((s, i) => (
            <div key={i} style={{ padding: '8px 20px', borderRight: i < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
              <div style={{ fontFamily: 'Sora', fontSize: 36, fontWeight: 700, color: 'var(--blue-glow)', lineHeight: 1.1 }}>
                <AnimatedCounter target={s.value} suffix={s.suffix} />
              </div>
              <div style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features grid ────────────────────────────────────── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <h2 style={{ fontFamily: 'Sora', fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 700, color: 'var(--white)', marginBottom: 12 }}>
            Everything Your Municipality Needs
          </h2>
          <p style={{ color: 'var(--gray-500)', fontSize: 16, maxWidth: 480, margin: '0 auto' }}>
            From reporting to resolution, every step is transparent and trackable.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {FEATURES.map(({ icon: Icon, color, bg, title, desc }) => (
            <div key={title} className="card card-hover" style={{ padding: 24 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Icon size={22} color={color} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--white)' }}>{title}</h3>
              <p style={{ fontSize: 14, color: 'var(--gray-500)', lineHeight: 1.65 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Roles section ────────────────────────────────────── */}
      <section style={{ background: 'var(--navy-mid)', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontFamily: 'Sora', fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 700, color: 'var(--white)', marginBottom: 12 }}>
              Built for Every Role
            </h2>
            <p style={{ color: 'var(--gray-500)', fontSize: 16 }}>One platform, three powerful perspectives.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {ROLES.map(({ icon, color, role, desc, actions }) => (
              <div key={role} className="card" style={{ border: `1px solid ${color}25`, background: `linear-gradient(135deg, ${color}08, transparent)` }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{icon}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color, marginBottom: 10 }}>{role}</h3>
                <p style={{ fontSize: 14, color: 'var(--gray-500)', lineHeight: 1.65, marginBottom: 16 }}>{desc}</p>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {actions.map(a => (
                    <li key={a} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--gray-300)' }}>
                      <CheckCircle size={13} color={color} style={{ flexShrink: 0 }} /> {a}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.15), rgba(13,148,136,0.15))', border: '1px solid rgba(37,99,235,0.25)', padding: '60px 40px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏛️</div>
          <h2 style={{ fontFamily: 'Sora', fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 700, marginBottom: 14 }}>
            Ready to improve your city?
          </h2>
          <p style={{ color: 'var(--gray-400)', fontSize: 16, marginBottom: 28, maxWidth: 480, margin: '0 auto 28px' }}>
            Join citizens and authorities working together to build a cleaner, safer, better-connected city.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" className="btn btn-primary" style={{ fontSize: 15, padding: '12px 32px' }}>
              Register as Citizen <ArrowRight size={16} />
            </Link>
            <Link to="/login" className="btn btn-secondary" style={{ fontSize: 15, padding: '12px 32px' }}>
              Authority Login
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(135deg, var(--blue), var(--teal))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MapPin size={13} color="white" />
          </div>
          <span style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 14, color: 'var(--white)' }}>CivicTracker</span>
        </div>
        <p style={{ color: 'var(--gray-500)', fontSize: 12 }}>© 2026 CivicTracker · Citizen Issue Resolution System · CS5304 Project</p>
      </footer>
    </div>
  );
}
