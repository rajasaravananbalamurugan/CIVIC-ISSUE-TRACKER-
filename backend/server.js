require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { initializeDatabase } = require('./database/db');
const { startWeeklyDigestJob } = require('./jobs/weeklyDigest');
const { startReminderNudgeJob } = require('./jobs/reminderNudge');

const app = express();
const PORT = process.env.PORT || 5000;

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'], credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(uploadsDir));

app.get('/api/health', (req, res) => res.json({ status: 'OK', message: 'Civic Tracker API is running' }));

// Initialize DB then mount routes and start cron jobs
initializeDatabase().then(() => {
  const authRoutes = require('./routes/auth');
  const complaintRoutes = require('./routes/complaints');
  const adminRoutes = require('./routes/admin');
  const notificationRoutes = require('./routes/notifications');
  const aiRoutes = require('./routes/ai');
  const publicRoutes = require('./routes/public');
  const announcementsRoutes = require('./routes/announcements');
  const chatRoutes = require('./routes/chat');
  const citizensRoutes = require('./routes/citizens');

  app.use('/api/auth', authRoutes);
  app.use('/api/complaints', complaintRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/public', publicRoutes);
  app.use('/api/announcements', announcementsRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/citizens', citizensRoutes);

  // Start cron jobs
  startWeeklyDigestJob();
  startReminderNudgeJob();

  app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  });

  app.listen(PORT, () => {
    console.log(`\n🏛️  Civic Tracker API → http://localhost:${PORT}`);
    console.log(`📊  Health check → http://localhost:${PORT}/api/health\n`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
