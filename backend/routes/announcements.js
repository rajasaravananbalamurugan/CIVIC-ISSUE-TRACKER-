const express = require('express');
const { query, queryOne, run, saveDb } = require('../database/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/announcements (Active announcements for user ward or All Wards)
router.get('/', authenticateToken, (req, res) => {
  const userWard = req.user.ward || 'Ward 1';
  const showExpired = req.query.expired === 'true';

  let where = [];
  let params = [];

  if (!showExpired) {
    where.push("(expires_at IS NULL OR expires_at > datetime('now'))");
  }

  if (req.user.role === 'citizen') {
    where.push("(a.ward = 'All Wards' OR a.ward = ? OR a.ward LIKE ?)");
    params.push(userWard, `%${userWard}%`);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const announcements = query(`
    SELECT a.*, u.name as author_name
    FROM announcements a
    JOIN users u ON a.created_by = u.id
    ${whereClause}
    ORDER BY a.created_at DESC
  `, params);

  res.json(announcements);
});

// POST /api/announcements (Create announcement - Admin only)
router.post('/', authenticateToken, requireRole('admin'), (req, res) => {
  const { title, message, ward, priority, expires_at } = req.body;
  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message are required' });
  }

  const result = run(`
    INSERT INTO announcements (title, message, ward, priority, expires_at, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [title, message, ward || 'All Wards', priority || 'Medium', expires_at || null, req.user.id]);

  saveDb();

  const announcement = queryOne(`
    SELECT a.*, u.name as author_name
    FROM announcements a JOIN users u ON a.created_by = u.id
    WHERE a.id = ?
  `, [result.lastInsertRowid]);

  res.status(201).json({ message: 'Announcement posted successfully', announcement });
});

// DELETE /api/announcements/:id (Delete announcement - Admin only)
router.delete('/:id', authenticateToken, requireRole('admin'), (req, res) => {
  const existing = queryOne('SELECT id FROM announcements WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Announcement not found' });

  run('DELETE FROM announcements WHERE id = ?', [req.params.id]);
  saveDb();

  res.json({ message: 'Announcement deleted successfully' });
});

module.exports = router;
