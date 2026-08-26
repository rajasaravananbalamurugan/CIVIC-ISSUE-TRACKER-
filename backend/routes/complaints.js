const express = require('express');
const multer = require('multer');
const path = require('path');
const { query, queryOne, run, saveDb } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const { sendStatusChangeEmail } = require('../services/email');
const { sendSMS } = require('../utils/sms');

const router = express.Router();

// ── SLA config ────────────────────────────────────────────────────────────────
const SLA_DAYS = {
  'Pothole': 7,
  'Garbage': 3,
  'Streetlight': 5,
  'Water Supply': 2,
};
function getSLADays(category) {
  return SLA_DAYS[category] || 7;
}
function getDaysOverdue(createdAt, slaDays, status) {
  if (status === 'Resolved' || status === 'Rejected') return 0;
  const created = new Date(createdAt);
  const deadline = new Date(created.getTime() + slaDays * 24 * 60 * 60 * 1000);
  const now = new Date();
  const diff = Math.floor((now - deadline) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

// ── Multer setup ──────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `complaint_${Date.now()}_${Math.random().toString(36).substr(2, 6)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    if (allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype)) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

function generateComplaintId() {
  const year = new Date().getFullYear();
  const count = (queryOne('SELECT COUNT(*) as cnt FROM complaints') || { cnt: 0 }).cnt + 1;
  return `CMP-${year}-${String(count).padStart(4, '0')}`;
}

// ── Helper: enrich a complaint with SLA + upvote info ─────────────────────────
function enrichComplaint(c) {
  if (!c) return c;
  const daysOverdue = getDaysOverdue(c.created_at, c.sla_days || 7, c.status);
  return {
    ...c,
    days_overdue: daysOverdue,
    is_overdue: daysOverdue > 0 ? 1 : 0,
    sla_days: c.sla_days || 7,
    upvote_count: c.upvote_count || 0,
  };
}

// ── Create in-app notification ────────────────────────────────────────────────
function createNotification(userId, complaintId, complaintRef, message) {
  try {
    run('INSERT INTO notifications (user_id, complaint_id, complaint_ref, message) VALUES (?, ?, ?, ?)',
      [userId, complaintId, complaintRef, message]);
    saveDb();
  } catch (err) {
    console.error('[Notification] Failed to create:', err.message);
  }
}

// ── GET /api/complaints ───────────────────────────────────────────────────────
router.get('/', authenticateToken, (req, res) => {
  const { status, category, priority, ward, search, page = 1, limit = 10 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where = [];
  let params = [];

  if (req.user.role === 'citizen') { where.push('c.citizen_id = ?'); params.push(req.user.id); }
  if (status) { where.push('c.status = ?'); params.push(status); }
  if (category) { where.push('c.category = ?'); params.push(category); }
  if (priority) { where.push('c.priority = ?'); params.push(priority); }
  if (ward) { where.push('c.ward = ?'); params.push(ward); }
  if (search) {
    where.push('(c.title LIKE ? OR c.description LIKE ? OR c.complaint_id LIKE ? OR c.address LIKE ?)');
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const complaints = query(`
    SELECT c.*, u.name as citizen_name, u.email as citizen_email, u.phone as citizen_phone,
      a.name as assigned_to_name
    FROM complaints c
    JOIN users u ON c.citizen_id = u.id
    LEFT JOIN users a ON c.assigned_to = a.id
    ${whereClause}
    ORDER BY c.upvote_count DESC, c.created_at DESC
    LIMIT ? OFFSET ?
  `, [...params, parseInt(limit), offset]);

  const totalRow = queryOne(`SELECT COUNT(*) as cnt FROM complaints c ${whereClause}`, params);
  const total = totalRow ? totalRow.cnt : 0;

  res.json({
    complaints: complaints.map(enrichComplaint),
    pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) }
  });
});

// ── POST /api/complaints ──────────────────────────────────────────────────────
router.post('/', authenticateToken, upload.single('image'), (req, res) => {
  const { title, description, category, priority, address, ward, latitude, longitude } = req.body;
  if (!title || !description || !category || !address) {
    return res.status(400).json({ error: 'Title, description, category, and address are required' });
  }

  const complaint_id = generateComplaintId();
  const image_url = req.file ? `/uploads/${req.file.filename}` : null;
  const slaDays = getSLADays(category);

  try {
    const result = run(`
      INSERT INTO complaints (complaint_id, citizen_id, title, description, category, priority, address, ward, latitude, longitude, image_url, sla_days)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [complaint_id, req.user.id, title, description, category, priority || 'Medium', address, ward || null,
        latitude ? parseFloat(latitude) : null, longitude ? parseFloat(longitude) : null, image_url, slaDays]);

    run('INSERT INTO status_history (complaint_id, new_status, changed_by, note) VALUES (?, ?, ?, ?)',
      [result.lastInsertRowid, 'Pending', req.user.id, 'Complaint filed']);

    // Notify: self notification for citizen
    createNotification(req.user.id, result.lastInsertRowid, complaint_id,
      `Your complaint ${complaint_id} has been filed. SLA: ${slaDays} days.`);

    saveDb();
    const complaint = queryOne(`SELECT c.*, u.name as citizen_name, u.email as citizen_email
      FROM complaints c JOIN users u ON c.citizen_id = u.id WHERE c.id = ?`, [result.lastInsertRowid]);
    res.status(201).json({ message: 'Complaint filed successfully', complaint: enrichComplaint(complaint) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to file complaint', message: err.message });
  }
});

// ── GET /api/complaints/stats/summary ────────────────────────────────────────
router.get('/stats/summary', authenticateToken, (req, res) => {
  const isCitizen = req.user.role === 'citizen';
  const citizenFilter = isCitizen ? 'WHERE citizen_id = ?' : '';
  const p = isCitizen ? [req.user.id] : [];

  const overview = queryOne(`SELECT COUNT(*) as total,
    SUM(CASE WHEN status='Pending' THEN 1 ELSE 0 END) as pending,
    SUM(CASE WHEN status='In Progress' THEN 1 ELSE 0 END) as inProgress,
    SUM(CASE WHEN status='Resolved' THEN 1 ELSE 0 END) as resolved,
    SUM(CASE WHEN status='Rejected' THEN 1 ELSE 0 END) as rejected
    FROM complaints ${citizenFilter}`, p);

  const byCategory = query(`SELECT category, COUNT(*) as count FROM complaints ${citizenFilter} GROUP BY category ORDER BY count DESC`, p);
  const recentComplaints = query(`SELECT c.complaint_id, c.title, c.status, c.category, c.priority, c.created_at, u.name as citizen_name
    FROM complaints c JOIN users u ON c.citizen_id = u.id ${citizenFilter} ORDER BY c.created_at DESC LIMIT 5`, p);

  res.json({ ...overview, byCategory, recentComplaints });
});

// ── GET /api/complaints/all/map ───────────────────────────────────────────────
router.get('/all/map', authenticateToken, (req, res) => {
  const { status, category } = req.query;
  let where = ['c.latitude IS NOT NULL AND c.longitude IS NOT NULL'];
  let params = [];

  if (req.user.role === 'citizen') { where.push('c.citizen_id = ?'); params.push(req.user.id); }
  if (status) { where.push('c.status = ?'); params.push(status); }
  if (category) { where.push('c.category = ?'); params.push(category); }

  const complaints = query(`
    SELECT c.id, c.complaint_id, c.title, c.category, c.status, c.priority,
      c.latitude, c.longitude, c.address, c.ward, c.created_at, c.upvote_count,
      c.sla_days, u.name as citizen_name
    FROM complaints c JOIN users u ON c.citizen_id = u.id
    WHERE ${where.join(' AND ')}
    ORDER BY c.created_at DESC
  `, params);

  res.json(complaints.map(enrichComplaint));
});

// ── GET /api/complaints/authority/calendar ────────────────────────────────────
router.get('/authority/calendar', authenticateToken, (req, res) => {
  if (req.user.role === 'citizen') return res.status(403).json({ error: 'Access denied' });

  let where = [];
  let params = [];
  if (req.user.role === 'authority') {
    where.push('c.assigned_to = ?');
    params.push(req.user.id);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const complaints = query(`
    SELECT c.*, u.name as citizen_name
    FROM complaints c
    JOIN users u ON c.citizen_id = u.id
    ${whereClause}
    ORDER BY c.created_at DESC
  `, params);

  const enriched = complaints.map(c => {
    const created = new Date(c.created_at);
    const sla = c.sla_days || 7;
    const deadlineDate = new Date(created.getTime() + sla * 24 * 60 * 60 * 1000);
    const deadlineIso = deadlineDate.toISOString().split('T')[0];
    const now = new Date();
    const daysLeft = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));

    let urgencyColor = 'green';
    if (c.status === 'Resolved' || c.status === 'Rejected') {
      urgencyColor = 'green';
    } else if (daysLeft < 0) {
      urgencyColor = 'red';
    } else if (daysLeft <= 2) {
      urgencyColor = 'amber';
    }

    return {
      ...enrichComplaint(c),
      deadline_date: deadlineIso,
      days_left: daysLeft,
      urgency_color: urgencyColor,
    };
  });

  res.json(enriched);
});

// ── GET /api/complaints/feed/nearby ──────────────────────────────────────────
router.get('/feed/nearby', authenticateToken, (req, res) => {
  const userWard = req.query.ward || req.user.ward || 'Ward 1';

  const complaints = query(`
    SELECT c.*, u.name as citizen_name
    FROM complaints c
    JOIN users u ON c.citizen_id = u.id
    WHERE (c.ward = ? OR c.ward LIKE ? OR c.address LIKE ?)
    ORDER BY c.created_at DESC
    LIMIT 50
  `, [userWard, `%${userWard}%`, `%${userWard}%`]);

  res.json(complaints.map(c => {
    const userUpvote = queryOne('SELECT id FROM upvotes WHERE complaint_id = ? AND user_id = ?', [c.id, req.user.id]);
    return {
      ...enrichComplaint(c),
      userHasUpvoted: !!userUpvote
    };
  }));
});

// ── GET /api/complaints/:id ───────────────────────────────────────────────────
router.get('/:id', authenticateToken, (req, res) => {
  const complaint = queryOne(`
    SELECT c.*, u.name as citizen_name, u.email as citizen_email, u.phone as citizen_phone,
      a.name as assigned_to_name, a.email as assigned_to_email
    FROM complaints c JOIN users u ON c.citizen_id = u.id LEFT JOIN users a ON c.assigned_to = a.id
    WHERE c.id = ? OR c.complaint_id = ?
  `, [req.params.id, req.params.id]);

  if (!complaint) return res.status(404).json({ error: 'Complaint not found' });
  if (req.user.role === 'citizen' && complaint.citizen_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Parent complaint ref
  let parentComplaintRef = null;
  if (complaint.parent_complaint_id) {
    const parentRow = queryOne('SELECT complaint_id FROM complaints WHERE id = ?', [complaint.parent_complaint_id]);
    if (parentRow) parentComplaintRef = parentRow.complaint_id;
  }

  // Child reopened complaint ref
  const childRow = queryOne('SELECT complaint_id FROM complaints WHERE parent_complaint_id = ?', [complaint.id]);
  const childComplaintRef = childRow ? childRow.complaint_id : null;

  const history = query(`SELECT sh.*, u.name as changed_by_name, u.role as changed_by_role
    FROM status_history sh JOIN users u ON sh.changed_by = u.id WHERE sh.complaint_id = ? ORDER BY sh.created_at ASC`, [complaint.id]);
  const comments = query(`SELECT cm.*, u.name as user_name, u.role as user_role
    FROM comments cm JOIN users u ON cm.user_id = u.id WHERE cm.complaint_id = ? ORDER BY cm.created_at ASC`, [complaint.id]);

  const userUpvote = queryOne('SELECT id FROM upvotes WHERE complaint_id = ? AND user_id = ?', [complaint.id, req.user.id]);
  const rating = queryOne('SELECT * FROM resolution_ratings WHERE complaint_id = ?', [complaint.id]);
  const aiPrediction = queryOne('SELECT * FROM ai_predictions WHERE complaint_id = ?', [complaint.id]);

  res.json({
    complaint: {
      ...enrichComplaint(complaint),
      parent_complaint_ref: parentComplaintRef,
      child_complaint_ref: childComplaintRef
    },
    history,
    comments,
    userHasUpvoted: !!userUpvote,
    rating: rating || null,
    aiPrediction: aiPrediction || null,
  });
});

// ── PUT /api/complaints/:id/after-photo ───────────────────────────────────────
// Feature 4: Upload after-repair photo
router.put('/:id/after-photo', authenticateToken, upload.single('after_image'), (req, res) => {
  if (req.user.role === 'citizen') return res.status(403).json({ error: 'Only authorities can upload after photos' });

  const complaint = queryOne('SELECT * FROM complaints WHERE id = ? OR complaint_id = ?', [req.params.id, req.params.id]);
  if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

  if (!req.file) return res.status(400).json({ error: 'No image file uploaded' });

  const after_image_url = `/uploads/${req.file.filename}`;
  run("UPDATE complaints SET after_image_url = ?, updated_at = datetime('now') WHERE id = ?", [after_image_url, complaint.id]);
  saveDb();

  res.json({ message: 'After photo uploaded successfully', after_image_url });
});

// ── POST /api/complaints/:id/reopen ───────────────────────────────────────────
// Feature 5: Reopen resolved complaint
router.post('/:id/reopen', authenticateToken, (req, res) => {
  const { reason } = req.body;
  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'Reopen reason is required' });
  }

  const original = queryOne('SELECT * FROM complaints WHERE id = ? OR complaint_id = ?', [req.params.id, req.params.id]);
  if (!original) return res.status(404).json({ error: 'Complaint not found' });
  if (original.citizen_id !== req.user.id) return res.status(403).json({ error: 'Only the citizen who filed this issue can reopen it' });
  if (original.status !== 'Resolved') return res.status(400).json({ error: 'Only resolved complaints can be reopened' });

  const newComplaintId = generateComplaintId();
  const newTitle = `REOPENED: ${original.title}`;
  const newDesc = `${original.description}\n\nREOPEN REASON: ${reason.trim()}`;

  try {
    // 1. Create new complaint linked via parent_complaint_id
    const result = run(`
      INSERT INTO complaints (complaint_id, citizen_id, title, description, category, priority, status, address, ward, latitude, longitude, image_url, parent_complaint_id, sla_days)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newComplaintId, req.user.id, newTitle, newDesc, original.category,
      original.priority, 'Pending', original.address, original.ward,
      original.latitude, original.longitude, original.image_url, original.id,
      original.sla_days || 7
    ]);

    const newId = result.lastInsertRowid;

    // 2. Status history on new complaint
    run('INSERT INTO status_history (complaint_id, new_status, changed_by, note) VALUES (?, ?, ?, ?)',
      [newId, 'Pending', req.user.id, `Complaint reopened by citizen — linked to ${original.complaint_id}`]);

    // 3. Comment on original complaint
    run('INSERT INTO comments (complaint_id, user_id, comment) VALUES (?, ?, ?)',
      [original.id, req.user.id, `This issue was reopened. New complaint filed: ${newComplaintId}`]);

    // 4. In-app notification for citizen
    createNotification(req.user.id, newId, newComplaintId, `Reopened issue logged as new complaint ${newComplaintId}.`);

    saveDb();

    res.status(201).json({
      message: 'Complaint reopened successfully',
      newComplaintId: newComplaintId,
      id: newId
    });
  } catch (err) {
    console.error('[Reopen Error]', err.message);
    res.status(500).json({ error: 'Failed to reopen complaint', message: err.message });
  }
});

// ── PUT /api/complaints/:id/status ────────────────────────────────────────────
// Feature 6: Send SMS on status change
router.put('/:id/status', authenticateToken, upload.single('after_image'), (req, res) => {
  if (req.user.role === 'citizen') return res.status(403).json({ error: 'Only authorities can update status' });

  const { status, note, priority, assigned_to } = req.body;
  const complaint = queryOne(`
    SELECT c.*, u.email as citizen_email, u.name as citizen_name, u.phone as citizen_phone, u.sms_enabled
    FROM complaints c JOIN users u ON c.citizen_id = u.id
    WHERE c.id = ? OR c.complaint_id = ?
  `, [req.params.id, req.params.id]);
  if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

  const oldStatus = complaint.status;
  const parts = [];
  const vals = [];

  if (status) { parts.push('status = ?'); vals.push(status); }
  if (priority) { parts.push('priority = ?'); vals.push(priority); }
  if (assigned_to !== undefined) { parts.push('assigned_to = ?'); vals.push(assigned_to || null); }
  if (note) { parts.push('resolution_note = ?'); vals.push(note); }
  if (status === 'Resolved') parts.push("resolved_at = datetime('now')");

  if (req.file) {
    const after_image_url = `/uploads/${req.file.filename}`;
    parts.push('after_image_url = ?');
    vals.push(after_image_url);
  }

  parts.push("updated_at = datetime('now')");

  run(`UPDATE complaints SET ${parts.join(', ')} WHERE id = ?`, [...vals, complaint.id]);

  if (status && status !== oldStatus) {
    run('INSERT INTO status_history (complaint_id, old_status, new_status, changed_by, note) VALUES (?, ?, ?, ?, ?)',
      [complaint.id, oldStatus, status, req.user.id, note || null]);

    // Create in-app notification for the citizen
    createNotification(
      complaint.citizen_id,
      complaint.id,
      complaint.complaint_id,
      `Your complaint ${complaint.complaint_id} status changed to "${status}".${note ? ' Note: ' + note : ''}`
    );

    // Send email notification (async)
    sendStatusChangeEmail({
      toEmail: complaint.citizen_email,
      toName: complaint.citizen_name,
      complaintId: complaint.complaint_id,
      complaintTitle: complaint.title,
      newStatus: status,
      oldStatus,
      resolutionNote: note || '',
    }).catch(err => console.error('[Email Error]', err.message));

    // Feature 6: Send SMS notification if sms_enabled is true
    const smsEnabled = complaint.sms_enabled === 1 || complaint.sms_enabled === true || complaint.sms_enabled === undefined;
    if (smsEnabled && complaint.citizen_phone) {
      const smsMsg = `Your complaint ${complaint.complaint_id} is now ${status}. Track it at civic.gov.in — CivicTracker`;
      sendSMS(complaint.citizen_phone, smsMsg).catch(err => console.error('[SMS Error]', err.message));
    }
  }

  saveDb();

  const updated = queryOne(`SELECT c.*, u.name as citizen_name, a.name as assigned_to_name
    FROM complaints c JOIN users u ON c.citizen_id = u.id LEFT JOIN users a ON c.assigned_to = a.id WHERE c.id = ?`, [complaint.id]);
  res.json({ message: 'Complaint updated successfully', complaint: enrichComplaint(updated) });
});

// ── POST /api/complaints/:id/comments ────────────────────────────────────────
router.post('/:id/comments', authenticateToken, (req, res) => {
  const { comment } = req.body;
  if (!comment) return res.status(400).json({ error: 'Comment is required' });

  const complaint = queryOne('SELECT id, complaint_id, citizen_id FROM complaints WHERE id = ? OR complaint_id = ?', [req.params.id, req.params.id]);
  if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

  run('INSERT INTO comments (complaint_id, user_id, comment) VALUES (?, ?, ?)', [complaint.id, req.user.id, comment]);

  if (req.user.id !== complaint.citizen_id) {
    createNotification(complaint.citizen_id, complaint.id, complaint.complaint_id,
      `New comment on your complaint ${complaint.complaint_id}.`);
  }

  saveDb();
  res.status(201).json({ message: 'Comment added successfully' });
});

// ── POST /api/complaints/:id/upvote ──────────────────────────────────────────
router.post('/:id/upvote', authenticateToken, (req, res) => {
  const complaint = queryOne('SELECT * FROM complaints WHERE id = ? OR complaint_id = ?', [req.params.id, req.params.id]);
  if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

  const existing = queryOne('SELECT id FROM upvotes WHERE complaint_id = ? AND user_id = ?', [complaint.id, req.user.id]);

  let upvoted;
  if (existing) {
    run('DELETE FROM upvotes WHERE complaint_id = ? AND user_id = ?', [complaint.id, req.user.id]);
    run('UPDATE complaints SET upvote_count = MAX(0, upvote_count - 1) WHERE id = ?', [complaint.id]);
    upvoted = false;
  } else {
    run('INSERT INTO upvotes (complaint_id, user_id) VALUES (?, ?)', [complaint.id, req.user.id]);
    run('UPDATE complaints SET upvote_count = upvote_count + 1 WHERE id = ?', [complaint.id]);
    upvoted = true;
  }

  const updated = queryOne('SELECT upvote_count, priority FROM complaints WHERE id = ?', [complaint.id]);
  if (updated && upvoted) {
    let newPriority = updated.priority;
    if (updated.upvote_count >= 50 && updated.priority !== 'Critical') {
      newPriority = 'Critical';
    } else if (updated.upvote_count >= 20 && !['Critical', 'High'].includes(updated.priority)) {
      newPriority = 'High';
    } else if (updated.upvote_count >= 10 && !['Critical', 'High', 'Medium'].includes(updated.priority)) {
      newPriority = 'Medium';
    }
    if (newPriority !== updated.priority) {
      run("UPDATE complaints SET priority = ?, updated_at = datetime('now') WHERE id = ?", [newPriority, complaint.id]);
    }
  }

  saveDb();
  const final = queryOne('SELECT upvote_count, priority FROM complaints WHERE id = ?', [complaint.id]);
  res.json({ upvoted, upvote_count: final.upvote_count, priority: final.priority });
});

// ── POST /api/complaints/:id/rating ──────────────────────────────────────────
router.post('/:id/rating', authenticateToken, (req, res) => {
  const { rating } = req.body;
  if (![1, -1].includes(Number(rating))) return res.status(400).json({ error: 'Rating must be 1 or -1' });

  const complaint = queryOne('SELECT * FROM complaints WHERE id = ? OR complaint_id = ?', [req.params.id, req.params.id]);
  if (!complaint) return res.status(404).json({ error: 'Complaint not found' });
  if (complaint.citizen_id !== req.user.id) return res.status(403).json({ error: 'Only the complaint owner can rate' });
  if (complaint.status !== 'Resolved') return res.status(400).json({ error: 'Can only rate resolved complaints' });

  const existing = queryOne('SELECT id FROM resolution_ratings WHERE complaint_id = ?', [complaint.id]);
  if (existing) return res.status(409).json({ error: 'You have already rated this complaint' });

  run('INSERT INTO resolution_ratings (complaint_id, citizen_id, rating) VALUES (?, ?, ?)',
    [complaint.id, req.user.id, Number(rating)]);
  saveDb();
  res.status(201).json({ message: 'Rating submitted', rating: Number(rating) });
});

module.exports = router;
