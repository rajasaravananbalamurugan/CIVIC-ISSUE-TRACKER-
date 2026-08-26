import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Complaints from './pages/Complaints';
import ComplaintDetail from './pages/ComplaintDetail';
import NewComplaint from './pages/NewComplaint';
import AdminPanel from './pages/AdminPanel';
import Analytics from './pages/Analytics';
import Profile from './pages/Profile';
import LandingPage from './pages/LandingPage';
import MapView from './pages/MapView';

// 10 New Feature Pages
import CrisisDashboard from './pages/CrisisDashboard';
import WorkCalendar from './pages/WorkCalendar';
import KanbanBoard from './pages/KanbanBoard';
import PublicTransparency from './pages/PublicTransparency';
import PublicTrack from './pages/PublicTrack';
import BadgesLeaderboard from './pages/BadgesLeaderboard';
import NearbyFeed from './pages/NearbyFeed';
import Announcements from './pages/Announcements';
import AIChatbot from './pages/AIChatbot';
import AuthorityPerformance from './pages/AuthorityPerformance';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh' }}>
      <div className="spinner" style={{ width:36, height:36 }} />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
        {/* Unauthenticated public pages (no JWT required) */}
        <Route path="/" element={<PublicOnlyRoute><LandingPage /></PublicOnlyRoute>} />
        <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
        <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />

        <Route path="/public" element={<PublicTransparency />} />
        <Route path="/track" element={<PublicTrack />} />

        {/* Protected app shell — all inner pages share the Layout */}
        <Route
          path="/dashboard"
          element={<ProtectedRoute><Layout /></ProtectedRoute>}
        >
          <Route index element={<Dashboard />} />
        </Route>

        <Route
          path="/crisis"
          element={<ProtectedRoute roles={['admin']}><Layout /></ProtectedRoute>}
        >
          <Route index element={<CrisisDashboard />} />
        </Route>

        <Route
          path="/calendar"
          element={<ProtectedRoute roles={['authority']}><Layout /></ProtectedRoute>}
        >
          <Route index element={<WorkCalendar />} />
        </Route>

        <Route
          path="/kanban"
          element={<ProtectedRoute roles={['admin','authority']}><Layout /></ProtectedRoute>}
        >
          <Route index element={<KanbanBoard />} />
        </Route>

        <Route
          path="/complaints"
          element={<ProtectedRoute><Layout /></ProtectedRoute>}
        >
          <Route index element={<Complaints />} />
          <Route path="new" element={<NewComplaint />} />
          <Route path=":id" element={<ComplaintDetail />} />
        </Route>

        <Route
          path="/feed"
          element={<ProtectedRoute roles={['citizen']}><Layout /></ProtectedRoute>}
        >
          <Route index element={<NearbyFeed />} />
        </Route>

        <Route
          path="/map"
          element={<ProtectedRoute><Layout /></ProtectedRoute>}
        >
          <Route index element={<MapView />} />
        </Route>

        <Route
          path="/badges"
          element={<ProtectedRoute roles={['citizen']}><Layout /></ProtectedRoute>}
        >
          <Route index element={<BadgesLeaderboard />} />
        </Route>

        <Route
          path="/chat"
          element={<ProtectedRoute roles={['citizen']}><Layout /></ProtectedRoute>}
        >
          <Route index element={<AIChatbot />} />
        </Route>

        <Route
          path="/announcements"
          element={<ProtectedRoute><Layout /></ProtectedRoute>}
        >
          <Route index element={<Announcements />} />
        </Route>

        <Route
          path="/performance"
          element={<ProtectedRoute roles={['authority']}><Layout /></ProtectedRoute>}
        >
          <Route index element={<AuthorityPerformance />} />
        </Route>

        <Route
          path="/analytics"
          element={<ProtectedRoute roles={['admin','authority']}><Layout /></ProtectedRoute>}
        >
          <Route index element={<Analytics />} />
        </Route>

        <Route
          path="/admin"
          element={<ProtectedRoute roles={['admin']}><Layout /></ProtectedRoute>}
        >
          <Route index element={<AdminPanel />} />
        </Route>

        <Route
          path="/profile"
          element={<ProtectedRoute><Layout /></ProtectedRoute>}
        >
          <Route index element={<Profile />} />
        </Route>

        {/* Catch all — redirect to dashboard if logged in, else landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}
