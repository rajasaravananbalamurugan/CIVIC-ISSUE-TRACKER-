const express = require('express');
const { query, queryOne, run, saveDb } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// GET /api/notifications
// Fetch last 10 notifications for logged-in user
router.get('/', (req, res) => {
  const notifications = query(`
    SELECT * FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 10
  `, [req.user.id]);

  res.json(notifications);
});

// GET /api/notifications/count
// Unread notifications count
router.get('/count', (req, res) => {
  const row = queryOne(`
    SELECT COUNT(*) as unread FROM notifications
    WHERE user_id = ? AND (is_read = 0 OR is_read IS NULL)
  `, [req.user.id]);

  res.json({ unread: row ? row.unread : 0 });
});

// PUT /api/notifications/read-all
// Mark all notifications as read
router.put('/read-all', (req, res) => {
  run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
  saveDb();
  res.json({ message: 'All notifications marked as read' });
});

// PUT /api/notifications/:id/read
// Mark single notification as read
router.put('/:id/read', (req, res) => {
  run('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  saveDb();
  res.json({ message: 'Notification marked as read' });
});

module.exports = router;
