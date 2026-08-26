const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'civic_tracker.db');
let db = null;
let SQL = null;

function saveDb() {
  if (db && SQL) {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }
}

// Synchronous-style helpers that match better-sqlite3's API style
function query(sql, params = []) {
  try {
    const result = db.exec(sql, params);
    if (!result || result.length === 0) return [];
    const { columns, values } = result[0];
    return values.map(row => {
      const obj = {};
      columns.forEach((col, i) => { obj[col] = row[i]; });
      return obj;
    });
  } catch (err) {
    throw err;
  }
}

function queryOne(sql, params = []) {
  const rows = query(sql, params);
  return rows[0] || null;
}

function run(sql, params = []) {
  db.run(sql, params);
  const lastId = queryOne('SELECT last_insert_rowid() as id');
  return { lastInsertRowid: lastId ? lastId.id : null };
}

// Safe ALTER TABLE — sql.js throws if column already exists
function safeAlter(sql) {
  try { db.run(sql); } catch (_) { /* column already exists */ }
}

async function initializeDatabase() {
  if (db) return;

  SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // ── Core tables ────────────────────────────────────────────────────────────

  // Users table
  run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'citizen',
    phone TEXT,
    ward TEXT,
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now'))
  )`);

  // Complaints table
  run(`CREATE TABLE IF NOT EXISTS complaints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    complaint_id TEXT UNIQUE NOT NULL,
    citizen_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending',
    priority TEXT NOT NULL DEFAULT 'Medium',
    address TEXT NOT NULL,
    ward TEXT,
    latitude REAL,
    longitude REAL,
    image_url TEXT,
    assigned_to INTEGER,
    resolution_note TEXT,
    resolved_at DATETIME,
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now'))
  )`);

  // Status history table
  run(`CREATE TABLE IF NOT EXISTS status_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    complaint_id INTEGER NOT NULL,
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_by INTEGER NOT NULL,
    note TEXT,
    created_at DATETIME DEFAULT (datetime('now'))
  )`);

  // Comments table
  run(`CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    complaint_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    comment TEXT NOT NULL,
    created_at DATETIME DEFAULT (datetime('now'))
  )`);

  // ── New tables ─────────────────────────────────────────────────────────────

  // Upvotes table
  run(`CREATE TABLE IF NOT EXISTS upvotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    complaint_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT (datetime('now')),
    UNIQUE(complaint_id, user_id)
  )`);

  // Resolution ratings table (👍/👎 from citizen after Resolved)
  run(`CREATE TABLE IF NOT EXISTS resolution_ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    complaint_id INTEGER NOT NULL UNIQUE,
    citizen_id INTEGER NOT NULL,
    rating INTEGER NOT NULL,
    created_at DATETIME DEFAULT (datetime('now'))
  )`);

  // In-app notifications table
  run(`CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    complaint_id INTEGER,
    complaint_ref TEXT,
    message TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT (datetime('now'))
  )`);

  // AI predictions table
  run(`CREATE TABLE IF NOT EXISTS ai_predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    complaint_id INTEGER NOT NULL UNIQUE,
    urgency_score INTEGER NOT NULL,
    recommended_priority TEXT NOT NULL,
    reason TEXT NOT NULL,
    accepted INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now'))
  )`);

  // Announcements table
  run(`CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    ward TEXT DEFAULT 'All Wards',
    priority TEXT DEFAULT 'Medium',
    expires_at DATETIME,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT (datetime('now'))
  )`);

  // Reminders table
  run(`CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    complaint_id INTEGER NOT NULL,
    citizen_id INTEGER NOT NULL,
    sent_at DATETIME DEFAULT (datetime('now')),
    type TEXT NOT NULL
  )`);

  // ── New columns on existing tables (safe alter) ────────────────────────────
  safeAlter('ALTER TABLE complaints ADD COLUMN upvote_count INTEGER DEFAULT 0');
  safeAlter('ALTER TABLE complaints ADD COLUMN sla_days INTEGER DEFAULT 7');
  safeAlter('ALTER TABLE complaints ADD COLUMN is_escalated INTEGER DEFAULT 0');
  safeAlter('ALTER TABLE complaints ADD COLUMN after_image_url TEXT');
  safeAlter('ALTER TABLE complaints ADD COLUMN parent_complaint_id INTEGER');
  safeAlter('ALTER TABLE users ADD COLUMN sms_enabled INTEGER DEFAULT 1');
  safeAlter('ALTER TABLE users ADD COLUMN digest_enabled INTEGER DEFAULT 1');

  saveDb();

  // ── Seed default users if not present ─────────────────────────────────────
  const existingAdmin = queryOne('SELECT id FROM users WHERE email = ?', ['admin@civic.gov.in']);
  if (!existingAdmin) {
    const adminPwd = bcrypt.hashSync('Admin@123', 10);
    run('INSERT INTO users (name, email, password, role, phone, ward) VALUES (?, ?, ?, ?, ?, ?)',
      ['System Admin', 'admin@civic.gov.in', adminPwd, 'admin', '9000000001', 'All']);

    const authPwd = bcrypt.hashSync('Auth@123', 10);
    run('INSERT INTO users (name, email, password, role, phone, ward) VALUES (?, ?, ?, ?, ?, ?)',
      ['Ward Officer - North', 'north.officer@civic.gov.in', authPwd, 'authority', '9000000002', 'Ward 1']);
    run('INSERT INTO users (name, email, password, role, phone, ward) VALUES (?, ?, ?, ?, ?, ?)',
      ['Ward Officer - South', 'south.officer@civic.gov.in', authPwd, 'authority', '9000000003', 'Ward 2']);

    const citizenPwd = bcrypt.hashSync('Citizen@123', 10);
    const citizenRes = run('INSERT INTO users (name, email, password, role, phone, ward) VALUES (?, ?, ?, ?, ?, ?)',
      ['Rajasaravanan B', 'raj@example.com', citizenPwd, 'citizen', '9876543210', 'Ward 1']);
    const citizenId = citizenRes.lastInsertRowid;

    // SLA days: Pothole=7, Garbage=3, Streetlight=5, Water Supply=2, others=7
    const samples = [
      ['CMP-2026-0001', citizenId, 'Large pothole on Main Street near bus stop',
       'There is a huge pothole near the bus stop on Main Street that has caused multiple accidents.',
       'Pothole', 'In Progress', 'High', '45, Main Street, Ward 1, Chennai - 600001', 'Ward 1', 13.0827, 80.2707, null, null, 7],
      ['CMP-2026-0002', citizenId, 'Street light not working for 2 weeks',
       'The street light at the junction near Anna Nagar 3rd street has not been working for 2 weeks.',
       'Streetlight', 'Pending', 'Medium', 'Anna Nagar 3rd Street Junction, Ward 2, Chennai - 600040', 'Ward 2', 13.0878, 80.2785, null, null, 5],
      ['CMP-2026-0003', citizenId, 'Garbage not collected for 5 days',
       'Garbage has not been collected for 5 consecutive days causing health hazards.',
       'Garbage', 'Resolved', 'Critical', '12, Nehru Street, Ward 1, Chennai - 600001', 'Ward 1', 13.0804, 80.2623, null, 'Garbage collected and area sanitized.', 3],
    ];
    for (const s of samples) {
      run(`INSERT INTO complaints (complaint_id, citizen_id, title, description, category, status, priority, address, ward, latitude, longitude, image_url, resolution_note, sla_days)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, s);
    }

    saveDb();
    console.log('✅ Database seeded');
    console.log('📧 Admin: admin@civic.gov.in / Admin@123');
    console.log('📧 Authority: north.officer@civic.gov.in / Auth@123');
    console.log('📧 Citizen: raj@example.com / Citizen@123');
  }
}

module.exports = { initializeDatabase, query, queryOne, run, saveDb };
