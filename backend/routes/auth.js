const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, queryOne, run, saveDb } = require('../database/db');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { name, email, password, phone, ward } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const existing = queryOne('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  try {
    const hashed = bcrypt.hashSync(password, 10);
    const result = run('INSERT INTO users (name, email, password, role, phone, ward, sms_enabled, digest_enabled) VALUES (?, ?, ?, ?, ?, ?, 1, 1)',
      [name, email.toLowerCase(), hashed, 'citizen', phone || null, ward || null]);
    saveDb();

    const user = queryOne('SELECT id, name, email, role, phone, ward, sms_enabled, digest_enabled, created_at FROM users WHERE id = ?', [result.lastInsertRowid]);
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ message: 'Registration successful', token, user });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed', message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  const user = queryOne('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
  const { password: _, ...safeUser } = user;
  res.json({ message: 'Login successful', token, user: safeUser });
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  const user = queryOne('SELECT id, name, email, role, phone, ward, sms_enabled, digest_enabled, created_at FROM users WHERE id = ?', [req.user.id]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// PUT /api/auth/profile
router.put('/profile', authenticateToken, (req, res) => {
  const { name, phone, ward, sms_enabled, digest_enabled } = req.body;

  const current = queryOne('SELECT * FROM users WHERE id = ?', [req.user.id]);

  const newName = name !== undefined ? name : current.name;
  const newPhone = phone !== undefined ? phone : current.phone;
  const newWard = ward !== undefined ? ward : current.ward;
  const newSms = sms_enabled !== undefined ? (sms_enabled ? 1 : 0) : (current.sms_enabled ?? 1);
  const newDigest = digest_enabled !== undefined ? (digest_enabled ? 1 : 0) : (current.digest_enabled ?? 1);

  run('UPDATE users SET name = ?, phone = ?, ward = ?, sms_enabled = ?, digest_enabled = ?, updated_at = datetime(\'now\') WHERE id = ?',
    [newName, newPhone || null, newWard || null, newSms, newDigest, req.user.id]);
  saveDb();

  const updated = queryOne('SELECT id, name, email, role, phone, ward, sms_enabled, digest_enabled, created_at FROM users WHERE id = ?', [req.user.id]);
  res.json({ message: 'Profile updated', user: updated });
});

// PUT /api/auth/change-password
router.put('/change-password', authenticateToken, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = queryOne('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!bcrypt.compareSync(currentPassword, user.password)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  const hashed = bcrypt.hashSync(newPassword, 10);
  run('UPDATE users SET password = ?, updated_at = datetime(\'now\') WHERE id = ?', [hashed, req.user.id]);
  saveDb();
  res.json({ message: 'Password changed successfully' });
});

module.exports = router;
