import React, { useEffect, useState } from 'react';
import { citizenApi } from '../utils/api';
import { Award, Trophy, ShieldCheck, Star, Zap, CheckCircle2, Lock, Flame } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BadgesLeaderboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    citizenApi.badges()
      .then(res => setData(res.data))
      .catch(() => toast.error('Failed to load achievement badges'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 350 }}>
        <div className="spinner" style={{ width: 36, height: 36 }} />
      </div>
    );
  }

  if (!data) return null;

  const { badges, totalFiled, totalResolved, wardLeaderboard, userWard } = data;
  const earnedCount = badges.filter(b => b.earned).length;

  return (
    <div style={{ maxWidth: 1000 }}>
      {/* Page Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(20,184,166,0.1) 100%)',
        border: '1px solid rgba(245,158,11,0.3)',
        borderRadius: 14, padding: '20px 24px', marginBottom: 24,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'rgba(245,158,11,0.25)', border: '1px solid rgba(245,158,11,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <Trophy size={26} color="var(--amber)" />
          </div>
          <div>
            <h1 className="page-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              🏆 Citizen Badges & Leaderboard
            </h1>
            <p className="page-subtitle" style={{ margin: '4px 0 0 0' }}>
              Earn recognition badges for active civic reporting and view your ward leaderboard
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{
            background: 'var(--navy-card)', padding: '8px 16px', borderRadius: 10,
            border: '1px solid var(--border)', textAlign: 'center'
          }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--amber)' }}>
              {earnedCount} / {badges.length}
            </div>
            <div style={{ fontSize: 11, color: 'var(--gray-500)', textTransform: 'uppercase' }}>Badges Unlocked</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>

        {/* Left Column: Badges Grid */}
        <div className="card" style={{ background: 'var(--navy-card)' }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Award size={20} color="var(--amber)" /> Your Civic Achievement Badges
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            {badges.map(b => (
              <div
                key={b.id}
                style={{
                  padding: '16px', borderRadius: 12,
                  background: b.earned ? 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(255,255,255,0.02) 100%)' : 'var(--navy-mid)',
                  border: b.earned ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(255,255,255,0.05)',
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                  opacity: b.earned ? 1 : 0.6
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: b.earned ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)',
                  border: b.earned ? '1px solid rgba(245,158,11,0.4)' : '1px solid rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0
                }}>
                  {b.icon}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: b.earned ? 'var(--white)' : 'var(--gray-300)' }}>
                      {b.title}
                    </h3>
                    {b.earned ? (
                      <span style={{ fontSize: 10, background: 'rgba(34,197,94,0.2)', color: 'var(--green)', padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>
                        UNLOCKED
                      </span>
                    ) : (
                      <Lock size={12} color="var(--gray-500)" />
                    )}
                  </div>

                  <p style={{ fontSize: 12, color: 'var(--gray-300)', margin: '0 0 8px 0', lineHeight: 1.4 }}>
                    {b.description}
                  </p>

                  <div style={{ fontSize: 11, color: b.earned ? 'var(--amber)' : 'var(--gray-500)', fontWeight: 600 }}>
                    {b.earned ? '✓ Earned' : `Progress: ${b.progress}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Ward Leaderboard */}
        <div className="card" style={{ background: 'var(--navy-card)' }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Flame size={20} color="var(--orange)" /> {userWard || 'Ward 1'} Leaderboard
          </h2>
          <p style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 18 }}>
            Top active citizen contributors in your ward this month
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {wardLeaderboard.length === 0 ? (
              <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--gray-500)', fontSize: 12 }}>
                No active complaints filed in this ward yet this month.
              </div>
            ) : (
              wardLeaderboard.map((user, idx) => (
                <div
                  key={user.id}
                  style={{
                    padding: '12px 14px', borderRadius: 10,
                    background: idx === 0 ? 'rgba(245,158,11,0.1)' : 'var(--navy-mid)',
                    border: idx === 0 ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(255,255,255,0.05)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: '50%',
                      background: idx === 0 ? 'var(--amber)' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : 'rgba(255,255,255,0.1)',
                      color: idx <= 2 ? 'black' : 'var(--white)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: 12
                    }}>
                      {idx + 1}
                    </div>

                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--white)' }}>
                        {user.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>
                        {user.ward || 'Citizen'}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--blue-light)' }}>
                    {user.monthly_count} reports
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
