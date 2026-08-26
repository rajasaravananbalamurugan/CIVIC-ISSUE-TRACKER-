const cron = require('node-cron');
const { query, queryOne, run, saveDb } = require('../database/db');
const { sendEmail } = require('../utils/email');

async function executeReminderNudge() {
  console.log('[Reminder Nudge] Checking for pending complaints older than 5 days...');

  // Find complaints pending > 5 days without a recent reminder
  const complaints = query(`
    SELECT c.*, u.name as citizen_name, u.email as citizen_email,
      CAST((julianday('now') - julianday(c.created_at)) AS INTEGER) as days_pending
    FROM complaints c
    JOIN users u ON c.citizen_id = u.id
    WHERE c.status = 'Pending'
      AND julianday('now') - julianday(c.created_at) >= 5
      AND c.id NOT IN (
        SELECT complaint_id FROM reminders WHERE julianday('now') - julianday(sent_at) < 5
      )
  `);

  if (!complaints || complaints.length === 0) {
    console.log('[Reminder Nudge] No pending complaints requiring nudges.');
    return { count: 0 };
  }

  let count = 0;
  for (const c of complaints) {
    const days = c.days_pending || 5;
    const filedDate = new Date(c.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    // 1. In-app notification
    const inAppMsg = `⏰ Reminder: Your complaint ${c.complaint_id} — '${c.title}' has been pending for ${days} days. You can add more details or a comment to help authorities prioritize it.`;
    run('INSERT INTO notifications (user_id, complaint_id, complaint_ref, message) VALUES (?, ?, ?, ?)',
      [c.citizen_id, c.id, c.complaint_id, inAppMsg]);

    // 2. Email nudge
    const emailSubject = `⏰ Your complaint needs attention — ${c.complaint_id}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; background: #0b1329; color: #f8fafc; padding: 24px; border-radius: 12px; max-width: 550px; margin: 0 auto;">
        <h3 style="color: #f59e0b; margin-top: 0;">⏰ Complaint Pending Notice</h3>
        <p>Hi <strong>${c.citizen_name}</strong>,</p>
        <p>Your complaint '<strong>${c.title}</strong>' filed on ${filedDate} has been pending for <strong>${days} days</strong> with no update.</p>
        <p>Adding more details, photos, or comments can help authorities prioritize your complaint faster.</p>
        <div style="margin: 20px 0;">
          <a href="http://localhost:5174/complaints/${c.complaint_id}" style="background: #2563eb; color: white; padding: 10px 18px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            View and Update Complaint →
          </a>
        </div>
        <p style="font-size: 12px; color: #64748b;">— CivicTracker Team</p>
      </div>
    `;

    if (c.citizen_email) {
      await sendEmail(c.citizen_email, emailSubject, emailHtml);
    }

    // 3. Insert into reminders table
    run('INSERT INTO reminders (complaint_id, citizen_id, type) VALUES (?, ?, ?)',
      [c.id, c.citizen_id, 'email_inapp']);

    count++;
  }

  saveDb();
  console.log(`[Reminder Nudge] Sent nudges for ${count} complaints.`);
  return { count };
}

function startReminderNudgeJob() {
  // Schedule every day at 9:00 AM (0 9 * * *)
  cron.schedule('0 9 * * *', () => {
    executeReminderNudge().catch(err => console.error('[Reminder Nudge Error]', err.message));
  });
  console.log('⏰ [Cron] Reminder Nudge scheduled daily for 9:00 AM');
}

module.exports = { startReminderNudgeJob, executeReminderNudge };
