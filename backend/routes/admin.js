const express = require('express');
const bcrypt = require('bcryptjs');
const { query, queryOne, run, saveDb } = require('../database/db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { executeWeeklyDigest } = require('../jobs/weeklyDigest');
const { executeReminderNudge } = require('../jobs/reminderNudge');

const router = express.Router();
router.use(authenticateToken);

router.get('/users', requireRole('admin'), (req, res) => {
  const users = query(`SELECT u.id, u.name, u.email, u.role, u.phone, u.ward, u.created_at,
    (SELECT COUNT(*) FROM complaints WHERE citizen_id = u.id) as complaint_count
    FROM users u ORDER BY u.created_at DESC`);
  res.json(users);
});

router.post('/users', requireRole('admin'), (req, res) => {
  const { name, email, password, role, phone, ward } = req.body;
  if (!name || !email || !password || !role) return res.status(400).json({ error: 'All fields required' });

  const existing = queryOne('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const hashed = bcrypt.hashSync(password, 10);
  const result = run('INSERT INTO users (name, email, password, role, phone, ward) VALUES (?, ?, ?, ?, ?, ?)',
    [name, email.toLowerCase(), hashed, role, phone || null, ward || null]);
  saveDb();

  const user = queryOne('SELECT id, name, email, role, phone, ward, created_at FROM users WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json({ message: 'User created', user });
});

router.get('/authorities', requireRole('admin', 'authority'), (req, res) => {
  const authorities = query("SELECT id, name, email, ward FROM users WHERE role IN ('authority', 'admin') ORDER BY name");
  res.json(authorities);
});

router.delete('/users/:id', requireRole('admin'), (req, res) => {
  const user = queryOne('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.role === 'admin') return res.status(400).json({ error: 'Cannot delete admin users' });
  run('DELETE FROM users WHERE id = ?', [req.params.id]);
  saveDb();
  res.json({ message: 'User deleted' });
});

router.get('/analytics', requireRole('admin', 'authority'), (req, res) => {
  const overview = queryOne(`SELECT COUNT(*) as total,
    SUM(CASE WHEN status='Pending' THEN 1 ELSE 0 END) as pending,
    SUM(CASE WHEN status='In Progress' THEN 1 ELSE 0 END) as inProgress,
    SUM(CASE WHEN status='Resolved' THEN 1 ELSE 0 END) as resolved,
    SUM(CASE WHEN status='Rejected' THEN 1 ELSE 0 END) as rejected,
    SUM(CASE WHEN priority='Critical' THEN 1 ELSE 0 END) as critical
    FROM complaints`);

  const byCategory = query(`SELECT category, COUNT(*) as total,
    SUM(CASE WHEN status='Resolved' THEN 1 ELSE 0 END) as resolved
    FROM complaints GROUP BY category ORDER BY total DESC`);

  const byWard = query(`SELECT ward, COUNT(*) as total,
    SUM(CASE WHEN status='Resolved' THEN 1 ELSE 0 END) as resolved
    FROM complaints WHERE ward IS NOT NULL GROUP BY ward ORDER BY total DESC`);

  const recentActivity = query(`SELECT sh.*, c.complaint_id, c.title, u.name as changed_by_name
    FROM status_history sh JOIN complaints c ON sh.complaint_id = c.id
    JOIN users u ON sh.changed_by = u.id ORDER BY sh.created_at DESC LIMIT 10`);

  const monthlyTrend = query(`
    SELECT
      strftime('%Y-%m', created_at) as month,
      COUNT(*) as filed,
      SUM(CASE WHEN status='Resolved' THEN 1 ELSE 0 END) as resolved
    FROM complaints
    WHERE created_at >= date('now', '-6 months')
    GROUP BY strftime('%Y-%m', created_at)
    ORDER BY month ASC
  `);

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const formattedMonthlyTrend = monthlyTrend.map(row => {
    const [year, month] = row.month.split('-');
    return {
      month: `${monthNames[parseInt(month) - 1]} '${year.slice(2)}`,
      filed: row.filed,
      resolved: row.resolved,
    };
  });

  const totalCitizens = (queryOne("SELECT COUNT(*) as cnt FROM users WHERE role = 'citizen'") || {}).cnt || 0;
  const totalAuthorities = (queryOne("SELECT COUNT(*) as cnt FROM users WHERE role = 'authority'") || {}).cnt || 0;

  const avgResolution = queryOne(`
    SELECT ROUND(AVG(
      julianday(resolved_at) - julianday(created_at)
    ), 1) as avg_days
    FROM complaints
    WHERE status = 'Resolved' AND resolved_at IS NOT NULL
  `);

  const ratingsRow = queryOne(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as positive,
      SUM(CASE WHEN rating = -1 THEN 1 ELSE 0 END) as negative
    FROM resolution_ratings
  `);

  const slaBreaches = query(`
    SELECT category, COUNT(*) as overdue_count
    FROM complaints
    WHERE status NOT IN ('Resolved', 'Rejected')
    AND (
      (category = 'Pothole'      AND julianday('now') - julianday(created_at) > 7) OR
      (category = 'Garbage'      AND julianday('now') - julianday(created_at) > 3) OR
      (category = 'Streetlight'  AND julianday('now') - julianday(created_at) > 5) OR
      (category = 'Water Supply' AND julianday('now') - julianday(created_at) > 2) OR
      (category NOT IN ('Pothole','Garbage','Streetlight','Water Supply') AND julianday('now') - julianday(created_at) > 7)
    )
    GROUP BY category ORDER BY overdue_count DESC
  `);

  const allRatings = query(`
    SELECT rr.*, c.complaint_id, c.title, u.name as citizen_name
    FROM resolution_ratings rr
    JOIN complaints c ON rr.complaint_id = c.id
    JOIN users u ON rr.citizen_id = u.id
    ORDER BY rr.created_at DESC
    LIMIT 50
  `);

  res.json({
    overview,
    byCategory,
    byWard,
    recentActivity,
    monthlyTrend: formattedMonthlyTrend,
    totalCitizens,
    totalAuthorities,
    avgResolutionDays: avgResolution?.avg_days || null,
    ratingsRow: ratingsRow || { total: 0, positive: 0, negative: 0 },
    slaBreaches,
    allRatings,
  });
});

// ── Crisis Dashboard Endpoint ────────────────────────────────────────────────
router.get('/crisis', requireRole('admin'), (req, res) => {
  const critical = query(`
    SELECT c.*, u.name as citizen_name, a.name as assigned_to_name
    FROM complaints c
    JOIN users u ON c.citizen_id = u.id
    LEFT JOIN users a ON c.assigned_to = a.id
    WHERE c.priority = 'Critical' AND c.status NOT IN ('Resolved', 'Rejected')
    ORDER BY c.created_at DESC
  `);

  const overdue = query(`
    SELECT c.*, u.name as citizen_name, a.name as assigned_to_name,
      ROUND(julianday('now') - julianday(c.created_at) - c.sla_days, 1) as days_overdue
    FROM complaints c
    JOIN users u ON c.citizen_id = u.id
    LEFT JOIN users a ON c.assigned_to = a.id
    WHERE c.status NOT IN ('Resolved', 'Rejected')
      AND (julianday('now') - julianday(c.created_at) > COALESCE(c.sla_days, 7))
    ORDER BY days_overdue DESC
  `);

  const wardSpikes = query(`
    SELECT ward, COUNT(*) as spike_count
    FROM complaints
    WHERE created_at >= datetime('now', '-24 hours') AND ward IS NOT NULL
    GROUP BY ward
    HAVING spike_count >= 3
    ORDER BY spike_count DESC
  `);

  const unassigned48h = query(`
    SELECT c.*, u.name as citizen_name
    FROM complaints c
    JOIN users u ON c.citizen_id = u.id
    WHERE c.assigned_to IS NULL
      AND c.status = 'Pending'
      AND (julianday('now') - julianday(c.created_at) > 2)
    ORDER BY c.created_at ASC
  `);

  res.json({
    critical,
    overdue,
    wardSpikes,
    unassigned48h
  });
});

// ── Escalate Complaint Endpoint ──────────────────────────────────────────────
router.post('/escalate/:id', requireRole('admin', 'authority'), (req, res) => {
  const complaint = queryOne('SELECT * FROM complaints WHERE id = ? OR complaint_id = ?', [req.params.id, req.params.id]);
  if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

  run("UPDATE complaints SET is_escalated = 1, priority = 'Critical', updated_at = datetime('now') WHERE id = ?", [complaint.id]);

  run('INSERT INTO status_history (complaint_id, old_status, new_status, changed_by, note) VALUES (?, ?, ?, ?, ?)',
    [complaint.id, complaint.status, complaint.status, req.user.id, `🚨 ESCALATED TO CRITICAL BY ADMIN (${req.user.name})`]);

  run('INSERT INTO notifications (user_id, complaint_id, complaint_ref, message) VALUES (?, ?, ?, ?)',
    [complaint.citizen_id, complaint.id, complaint.complaint_id, `🚨 ALERT: Your complaint ${complaint.complaint_id} has been escalated to CRITICAL priority by administrators.`]);

  if (complaint.assigned_to) {
    run('INSERT INTO notifications (user_id, complaint_id, complaint_ref, message) VALUES (?, ?, ?, ?)',
      [complaint.assigned_to, complaint.id, complaint.complaint_id, `🚨 ESCALATION NOTICE: Complaint ${complaint.complaint_id} assigned to you has been escalated to CRITICAL priority.`]);
  }

  saveDb();
  res.json({ message: 'Complaint escalated successfully', complaint_id: complaint.complaint_id });
});

// ── Authority Performance Dashboard Endpoint ─────────────────────────────────
router.get('/performance', requireRole('authority', 'admin'), (req, res) => {
  const targetUserId = req.query.officer_id ? parseInt(req.query.officer_id) : req.user.id;
  const officer = queryOne('SELECT id, name, email, ward FROM users WHERE id = ?', [targetUserId]);

  if (!officer) return res.status(404).json({ error: 'Officer not found' });

  const assignedCount = (queryOne('SELECT COUNT(*) as cnt FROM complaints WHERE assigned_to = ?', [targetUserId]) || {}).cnt || 0;
  const resolvedCount = (queryOne("SELECT COUNT(*) as cnt FROM complaints WHERE assigned_to = ? AND status = 'Resolved'", [targetUserId]) || {}).cnt || 0;
  const pendingCount = (queryOne("SELECT COUNT(*) as cnt FROM complaints WHERE assigned_to = ? AND status IN ('Pending', 'In Progress')", [targetUserId]) || {}).cnt || 0;

  const avgResolution = queryOne(`
    SELECT ROUND(AVG(julianday(resolved_at) - julianday(created_at)), 1) as avg_days
    FROM complaints
    WHERE assigned_to = ? AND status = 'Resolved' AND resolved_at IS NOT NULL
  `, [targetUserId]);

  const ratingStats = queryOne(`
    SELECT
      COUNT(*) as total_ratings,
      SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as positive,
      SUM(CASE WHEN rating = -1 THEN 1 ELSE 0 END) as negative
    FROM resolution_ratings rr
    JOIN complaints c ON rr.complaint_id = c.id
    WHERE c.assigned_to = ?
  `, [targetUserId]) || { total_ratings: 0, positive: 0, negative: 0 };

  const satisfactionScore = ratingStats.total_ratings > 0
    ? Math.round((ratingStats.positive / ratingStats.total_ratings) * 100)
    : 100;

  const resolutionRate = assignedCount > 0 ? Math.round((resolvedCount / assignedCount) * 100) : 0;

  const byCategory = query(`
    SELECT category, COUNT(*) as resolved_count
    FROM complaints
    WHERE assigned_to = ? AND status = 'Resolved'
    GROUP BY category ORDER BY resolved_count DESC
  `, [targetUserId]);

  const officerLeaderboard = query(`
    SELECT u.id, u.name, COUNT(c.id) as resolved_cnt
    FROM users u
    LEFT JOIN complaints c ON c.assigned_to = u.id AND c.status = 'Resolved'
    WHERE u.role IN ('authority', 'admin')
    GROUP BY u.id
    ORDER BY resolved_cnt DESC, u.name ASC
  `);

  const rankIndex = officerLeaderboard.findIndex(o => o.id === targetUserId);
  const officerRank = rankIndex !== -1 ? rankIndex + 1 : officerLeaderboard.length;
  const totalOfficers = officerLeaderboard.length;

  res.json({
    officer,
    assignedCount,
    resolvedCount,
    pendingCount,
    avgResolutionDays: avgResolution?.avg_days || 0,
    satisfactionScore,
    resolutionRate,
    byCategory,
    officerRank,
    totalOfficers
  });
});

// ── Feature 7: Manual Trigger Weekly Digest (Admin Only) ──────────────────────
router.post('/trigger-digest', requireRole('admin'), async (req, res) => {
  try {
    const result = await executeWeeklyDigest();
    res.json({ message: 'Weekly digest triggered successfully', result });
  } catch (err) {
    res.status(500).json({ error: 'Failed to trigger digest', message: err.message });
  }
});

// ── Feature 8: Manual Trigger Reminder Nudges (Admin Only) ────────────────────
router.post('/trigger-reminders', requireRole('admin'), async (req, res) => {
  try {
    const result = await executeReminderNudge();
    res.json({ message: 'Reminder nudges triggered successfully', result });
  } catch (err) {
    res.status(500).json({ error: 'Failed to trigger reminders', message: err.message });
  }
});

module.exports = router;
