const express = require('express');
const { query, queryOne } = require('../database/db');

const router = express.Router();

// ── GET /api/public/transparency (Public Portal Data) ──────────────────────────
router.get('/transparency', (req, res) => {
  const totals = queryOne(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
      SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending
    FROM complaints
  `) || { total: 0, resolved: 0, in_progress: 0, pending: 0 };

  const resolutionRate = totals.total > 0 ? Math.round((totals.resolved / totals.total) * 100) : 0;

  const topCategories = query(`
    SELECT category, COUNT(*) as count
    FROM complaints
    GROUP BY category
    ORDER BY count DESC
    LIMIT 3
  `);

  const wardLeaderboard = query(`
    SELECT
      COALESCE(ward, 'General') as ward,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
      ROUND(CAST(SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) * 100, 1) as rate
    FROM complaints
    GROUP BY COALESCE(ward, 'General')
    ORDER BY rate DESC, total DESC
    LIMIT 10
  `);

  const recentlyResolved = query(`
    SELECT complaint_id, title, category, ward, resolved_at, resolution_note, created_at
    FROM complaints
    WHERE status = 'Resolved' AND resolved_at IS NOT NULL
    ORDER BY resolved_at DESC
    LIMIT 5
  `);

  res.json({
    totalComplaints: totals.total,
    resolvedCount: totals.resolved,
    inProgressCount: totals.in_progress,
    pendingCount: totals.pending,
    resolutionRate,
    topCategories,
    wardLeaderboard,
    recentlyResolved
  });
});

// ── GET /api/public/track/:complaintId (Public Complaint Lookup) ─────────────
router.get('/track/:complaintId', (req, res) => {
  const complaintId = req.params.complaintId.trim().toUpperCase();

  const complaint = queryOne(`
    SELECT
      id, complaint_id, title, description, category, status, priority,
      address, ward, resolution_note, created_at, resolved_at, sla_days, assigned_to
    FROM complaints
    WHERE UPPER(complaint_id) = ? OR id = ?
  `, [complaintId, complaintId]);

  if (!complaint) {
    return res.status(404).json({ error: 'Complaint not found with provided ID' });
  }

  const history = query(`
    SELECT old_status, new_status, note, created_at
    FROM status_history
    WHERE complaint_id = ?
    ORDER BY created_at ASC
  `, [complaint.id]);

  res.json({
    complaint: {
      ...complaint,
      is_assigned: !!complaint.assigned_to
    },
    history
  });
});

module.exports = router;
