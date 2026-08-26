import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme, THEMES, THEME_PALETTES } from '../context/ThemeContext';
import {
  LayoutDashboard, FileText, PlusCircle, BarChart3,
  Users, LogOut, Menu, X, User, Shield, MapPin, Map, Palette,
  Bell, CheckCheck, AlertCircle, AlertOctagon, Calendar, LayoutGrid,
  Trophy, Compass, Megaphone, Bot, TrendingUp, Globe
} from 'lucide-react';
import { notificationsApi } from '../utils/api';

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const themePickerRef = useRef(null);

  // ── Notification Bell state ──────────────────────────────────────────────────
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const notifRef = useRef(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notificationsApi.getCount();
      setUnreadCount(res.data.unread || 0);
    } catch (_) {}
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoadingNotifs(true);
    try {
      const res = await notificationsApi.getAll();
      setNotifications(res.data || []);
    } catch (_) {} finally {
      setLoadingNotifs(false);
    }
  }, []);

  // Poll unread count every 60 seconds
  useEffect(() => {
    if (!user) return;
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [user, fetchUnreadCount]);

  // Open notification panel
  const handleBellClick = async () => {
    setShowNotifPanel(v => !v);
    if (!showNotifPanel) {
      await fetchNotifications();
    }
  };

  const handleMarkAllRead = async () => {
    await notificationsApi.markAllRead();
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
  };

  // Close panels on outside click
  useEffect(() => {
    const handler = (e) => {
      if (themePickerRef.current && !themePickerRef.current.contains(e.target)) {
        setShowThemePicker(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifPanel(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },

    // Role-specific primary features
    ...(user?.role === 'admin' ? [{ to: '/crisis', icon: AlertOctagon, label: 'Crisis Control' }] : []),
    ...(user?.role === 'authority' ? [{ to: '/calendar', icon: Calendar, label: 'Work Calendar' }] : []),
    ...(user?.role === 'citizen' ? [{ to: '/complaints/new', icon: PlusCircle, label: 'File Complaint' }] : []),
    ...(user?.role === 'citizen' ? [{ to: '/feed', icon: Compass, label: 'Nearby Feed' }] : []),

    { to: '/complaints', icon: FileText, label: 'Complaints' },
    ...(user?.role !== 'citizen' ? [{ to: '/kanban', icon: LayoutGrid, label: 'Kanban Board' }] : []),
    { to: '/map', icon: Map, label: 'Map View' },

    ...(user?.role === 'citizen' ? [{ to: '/badges', icon: Trophy, label: 'Badges & Rank' }] : []),
    ...(user?.role === 'citizen' ? [{ to: '/chat', icon: Bot, label: 'AI Chatbot' }] : []),

    ...(user?.role === 'authority' ? [{ to: '/performance', icon: TrendingUp, label: 'My Performance' }] : []),
    ...(user?.role !== 'citizen' ? [{ to: '/analytics', icon: BarChart3, label: 'Analytics' }] : []),

    { to: '/announcements', icon: Megaphone, label: 'Announcements' },
    ...(user?.role === 'admin' ? [{ to: '/admin', icon: Users, label: 'Manage Users' }] : []),
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  const roleColors = { citizen: '#3b82f6', authority: '#14b8a6', admin: '#8b5cf6' };
  const roleColor = roleColors[user?.role] || '#64748b';
  const currentTheme = THEMES.find(t => t.id === theme);

  const formatNotifTime = (dt) => {
    const d = new Date(dt);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000 / 60);
    if (diff < 1) return 'just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40, backdropFilter: 'blur(2px)' }}
        />
      )}

      {/* ── Sidebar ───────────────────────────────────────────────── */}
      <aside
        className="sidebar"
        style={{
          width: 240, flexShrink: 0,
          background: 'var(--navy-mid)',
          borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50,
          transition: 'transform 0.25s ease',
        }}
      >
        {/* Logo */}
        <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, var(--blue), var(--teal))',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              boxShadow: 'var(--shadow-glow)',
            }}>
              <MapPin size={18} color="white" />
            </div>
            <div>
              <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 15, color: 'var(--white)' }}>CivicTracker</div>
              <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>Issue Resolution System</div>
            </div>
          </div>
        </div>

        {/* User badge */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
            background: `${roleColor}18`, borderRadius: 8, border: `1px solid ${roleColor}35`,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: `${roleColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: roleColor }}>
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name}
              </div>
              <div style={{ fontSize: 11, color: roleColor, textTransform: 'capitalize', fontWeight: 500 }}>
                {user?.role === 'authority' ? '⚖️ Authority' : user?.role === 'admin' ? '🛡️ Admin' : '👤 Citizen'}
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                borderRadius: 8, color: isActive ? 'var(--white)' : 'var(--gray-300)',
                background: isActive ? 'var(--active-tint)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--blue)' : '3px solid transparent',
                fontSize: 14, fontWeight: isActive ? 600 : 400, transition: 'all 0.15s',
                textDecoration: 'none',
              })}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid var(--border)' }}>
          <button onClick={handleLogout} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────── */}
      <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {/* Top bar */}
        <header style={{
          height: 56, background: 'var(--navy-mid)', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', padding: '0 20px', gap: 16,
          position: 'sticky', top: 0, zIndex: 30,
          transition: 'background 0.3s, border-color 0.3s',
        }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="btn btn-secondary btn-sm sidebar-toggle"
            style={{ flexShrink: 0 }}
          >
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
            {user?.role !== 'citizen' && (
              <span style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 12, color: 'var(--teal-light)',
                background: 'rgba(13,148,136,0.1)', padding: '4px 10px',
                borderRadius: 20, border: '1px solid rgba(13,148,136,0.2)',
              }}>
                <Shield size={12} /> Authority Mode
              </span>
            )}

            {/* ── Notification Bell ────────────────────────────── */}
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button
                id="notification-bell-btn"
                onClick={handleBellClick}
                style={{
                  position: 'relative',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 36, height: 36,
                  background: showNotifPanel ? 'var(--active-tint)' : 'var(--navy-card)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 10, cursor: 'pointer',
                  color: 'var(--gray-100)',
                  transition: 'all 0.15s',
                }}
                title="Notifications"
              >
                <Bell size={16} style={{ color: unreadCount > 0 ? 'var(--amber)' : 'var(--gray-300)' }} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -4,
                    background: '#ef4444', color: 'white',
                    fontSize: 10, fontWeight: 700, borderRadius: '50%',
                    minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 3px', border: '2px solid var(--navy-mid)',
                    animation: 'pulse 2s infinite',
                  }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification dropdown */}
              {showNotifPanel && (
                <div
                  id="notification-panel"
                  style={{
                    position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                    width: 340,
                    background: 'var(--navy-card)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 14, zIndex: 200,
                    boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
                    animation: 'fadeIn 0.15s ease',
                    overflow: 'hidden',
                  }}
                >
                  {/* Header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px', borderBottom: '1px solid var(--border)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Bell size={14} color="var(--amber)" />
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)' }}>Notifications</span>
                      {unreadCount > 0 && (
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '2px 7px',
                          background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                          borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)',
                        }}>{unreadCount} new</span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          fontSize: 12, color: 'var(--blue-light)',
                          background: 'none', border: 'none', cursor: 'pointer',
                          padding: '4px 8px', borderRadius: 6,
                        }}
                      >
                        <CheckCheck size={13} /> Mark all read
                      </button>
                    )}
                  </div>

                  {/* List */}
                  <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                    {loadingNotifs ? (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                        <span className="spinner" />
                      </div>
                    ) : notifications.length === 0 ? (
                      <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                        <Bell size={28} color="var(--gray-500)" style={{ margin: '0 auto 10px' }} />
                        <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>No notifications yet</p>
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => {
                            if (n.complaint_ref) navigate(`/complaints/${n.complaint_ref}`);
                            setShowNotifPanel(false);
                          }}
                          style={{
                            display: 'flex', gap: 10, padding: '12px 16px',
                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                            background: n.is_read ? 'transparent' : 'rgba(59,130,246,0.05)',
                            cursor: n.complaint_ref ? 'pointer' : 'default',
                            transition: 'background 0.1s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                          onMouseLeave={e => e.currentTarget.style.background = n.is_read ? 'transparent' : 'rgba(59,130,246,0.05)'}
                        >
                          <div style={{
                            width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                            background: n.is_read ? 'transparent' : '#3b82f6',
                            marginTop: 6,
                            border: n.is_read ? '1px solid rgba(255,255,255,0.1)' : 'none',
                          }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: 13, color: n.is_read ? 'var(--gray-300)' : 'var(--white)',
                              lineHeight: 1.4, marginBottom: 4,
                            }}>
                              {n.message}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>
                              {formatNotifTime(n.created_at)}
                            </div>
                          </div>
                          {!n.is_read && (
                            <div style={{
                              width: 6, height: 6, borderRadius: '50%',
                              background: '#3b82f6', flexShrink: 0, marginTop: 8,
                            }} />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── Theme Switcher ───────────────────────────────── */}
            <div ref={themePickerRef} style={{ position: 'relative' }}>
              <button
                id="theme-toggle-btn"
                onClick={() => setShowThemePicker(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px',
                  background: 'var(--navy-card)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 10, cursor: 'pointer',
                  color: 'var(--gray-100)',
                  transition: 'all 0.15s',
                  fontSize: 13,
                }}
                title="Change theme"
              >
                <Palette size={14} style={{ color: 'var(--blue-light)' }} />
                <span style={{ fontSize: 15 }}>{currentTheme?.icon}</span>
                <span style={{ fontSize: 12, color: 'var(--gray-300)' }}>{currentTheme?.label}</span>
              </button>

              {/* Dropdown */}
              {showThemePicker && (
                <div
                  id="theme-picker-panel"
                  style={{
                    position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                    width: 210,
                    background: 'var(--navy-card)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 14, padding: '8px',
                    zIndex: 200,
                    boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
                    animation: 'fadeIn 0.15s ease',
                  }}
                >
                  <div style={{
                    fontSize: 10, fontWeight: 700, color: 'var(--gray-500)',
                    padding: '4px 8px 8px', textTransform: 'uppercase', letterSpacing: '0.08em',
                  }}>
                    Choose Theme
                  </div>

                  {THEMES.map(t => {
                    const palette = THEME_PALETTES[t.id] || [];
                    const isActive = theme === t.id;
                    return (
                      <button
                        key={t.id}
                        id={`theme-option-${t.id}`}
                        onClick={() => { setTheme(t.id); setShowThemePicker(false); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          width: '100%', padding: '9px 10px', borderRadius: 9,
                          border: isActive ? '1px solid var(--blue)' : '1px solid transparent',
                          cursor: 'pointer', textAlign: 'left',
                          background: isActive ? 'var(--active-tint)' : 'transparent',
                          color: 'var(--white)',
                          transition: 'all 0.12s',
                        }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--hover-tint)'; }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <span style={{ fontSize: 18, flexShrink: 0 }}>{t.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)' }}>{t.label}</div>
                          <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 1 }}>{t.desc}</div>
                        </div>
                        {/* Color swatches */}
                        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                          {palette.map((c, i) => (
                            <div key={i} style={{
                              width: 9, height: 9, borderRadius: '50%',
                              background: c, border: '1px solid rgba(255,255,255,0.25)',
                            }} />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </header>

        <main style={{ flex: 1, padding: '24px 20px', maxWidth: 1100, width: '100%', margin: '0 auto' }}>
          <Outlet />
        </main>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .sidebar { transform: translateX(0) !important; }
          .main-content { margin-left: 240px; }
          .sidebar-toggle { display: none !important; }
        }
        @media (max-width: 767px) {
          .sidebar { transform: ${sidebarOpen ? 'translateX(0)' : 'translateX(-100%)'} !important; }
          .main-content { margin-left: 0; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
}
