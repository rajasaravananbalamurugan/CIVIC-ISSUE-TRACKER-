const express = require('express');
const { query, queryOne } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// ── GET /api/citizens/badges ──────────────────────────────────────────────────
router.get('/badges', (req, res) => {
  const userId = req.user.id;
  const userWard = req.user.ward || 'Ward 1';

  // 1. Complaint stats for this user
  const totalFiled = (queryOne('SELECT COUNT(*) as cnt FROM complaints WHERE citizen_id = ?', [userId]) || {}).cnt || 0;
  const totalResolved = (queryOne("SELECT COUNT(*) as cnt FROM complaints WHERE citizen_id = ? AND status = 'Resolved'", [userId]) || {}).cnt || 0;

  // Quick resolver check (resolved within 48 hours)
  const quickResolvedCount = (queryOne(`
    SELECT COUNT(*) as cnt FROM complaints
    WHERE citizen_id = ? AND status = 'Resolved' AND resolved_at IS NOT NULL
      AND (julianday(resolved_at) - julianday(created_at) <= 2)
  `, [userId]) || {}).cnt || 0;

  // Ward rank this month
  const wardLeaderboard = query(`
    SELECT u.id, u.name, u.ward, COUNT(c.id) as monthly_count
    FROM users u
    JOIN complaints c ON c.citizen_id = u.id
    WHERE u.role = 'citizen' AND (u.ward = ? OR u.ward LIKE ?)
      AND c.created_at >= date('now', 'start of month')
    GROUP BY u.id
    ORDER BY monthly_count DESC
    LIMIT 5
  `, [userWard, `%${userWard}%`]);

  const isWardHero = wardLeaderboard.length > 0 && wardLeaderboard[0].id === userId;

  // Badge list definitions & status
  const badges = [
    {
      id: 'first_report',
      title: 'First Report',
      icon: '🌱',
      description: 'Filed your first civic issue report',
      earned: totalFiled >= 1,
      progress: `${Math.min(totalFiled, 1)} / 1`
    },
    {
      id: 'active_citizen',
      title: 'Active Citizen',
      icon: '⚡',
      description: 'Filed 5 or more civic complaints',
      earned: totalFiled >= 5,
      progress: `${Math.min(totalFiled, 5)} / 5`
    },
    {
      id: 'ward_hero',
      title: 'Ward Hero',
      icon: '👑',
      description: 'Top complaint contributor in your ward this month',
      earned: isWardHero,
      progress: isWardHero ? 'Rank #1' : 'Keep reporting'
    },
    {
      id: 'quick_resolver',
      title: 'Quick Resolver',
      icon: '🚀',
      description: 'Had a complaint resolved in under 48 hours',
      earned: quickResolvedCount >= 1,
      progress: `${quickResolvedCount} resolved <48h`
    },
    {
      id: 'verified_contributor',
      title: 'Verified Contributor',
      icon: '⭐',
      description: 'Successfully got 3 or more issues resolved',
      earned: totalResolved >= 3,
      progress: `${Math.min(totalResolved, 3)} / 3`
    }
  ];

  res.json({
    badges,
    totalFiled,
    totalResolved,
    wardLeaderboard,
    userWard
  });
});

module.exports = router;
