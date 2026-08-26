const cron = require('node-cron');
const { query, queryOne } = require('../database/db');
const { sendEmail } = require('../utils/email');

async function executeWeeklyDigest() {
  console.log('[Weekly Digest] Starting digest compilation...');

  const citizens = query(`
    SELECT id, name, email, ward, digest_enabled
    FROM users
    WHERE role = 'citizen' AND (digest_enabled = 1 OR digest_enabled IS NULL) AND ward IS NOT NULL AND email IS NOT NULL
  `);

  if (!citizens || citizens.length === 0) {
    console.log('[Weekly Digest] No eligible citizens found for digest.');
    return { count: 0 };
  }

  const todayStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  let sentCount = 0;

  for (const citizen of citizens) {
    const ward = citizen.ward;

    // Ward statistics over last 7 days
    const wardStats = queryOne(`
      SELECT
        COUNT(*) as total_filed,
        SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as total_resolved,
        SUM(CASE WHEN status = 'In Progress' OR status = 'Pending' THEN 1 ELSE 0 END) as total_in_progress
      FROM complaints
      WHERE ward = ? AND created_at >= datetime('now', '-7 days')
    `, [ward]) || { total_filed: 0, total_resolved: 0, total_in_progress: 0 };

    const totalFiled = wardStats.total_filed || 0;
    const totalResolved = wardStats.total_resolved || 0;
    const totalInProgress = wardStats.total_in_progress || 0;

    // Top category in ward this week
    const topCatRow = queryOne(`
      SELECT category, COUNT(*) as cnt
      FROM complaints
      WHERE ward = ? AND created_at >= datetime('now', '-7 days')
      GROUP BY category ORDER BY cnt DESC LIMIT 1
    `, [ward]);
    const topCategory = topCatRow ? `${topCatRow.category} (${topCatRow.cnt})` : 'None';

    // Citizen's own pending complaints
    const myPending = query(`
      SELECT complaint_id, title, created_at,
        CAST((julianday('now') - julianday(created_at)) AS INTEGER) as days_pending
      FROM complaints
      WHERE citizen_id = ? AND status = 'Pending'
      ORDER BY created_at ASC
    `, [citizen.id]);

    const resRate = totalFiled > 0 ? Math.round((totalResolved / totalFiled) * 100) : 0;
    let messageLine = '';
    if (resRate >= 70 && totalFiled > 0) {
      messageLine = `<div style="background: rgba(34,197,94,0.15); border: 1px solid #22c55e; padding: 12px; borderRadius: 8px; color: #22c55e; margin-bottom: 16px;">
        🌟 Great progress! Your ward resolved ${resRate}% of issues this week.
      </div>`;
    } else if (resRate <= 30 && totalFiled > 0) {
      messageLine = `<div style="background: rgba(239,68,68,0.15); border: 1px solid #ef4444; padding: 12px; borderRadius: 8px; color: #ef4444; margin-bottom: 16px;">
        ⚠️ Your ward needs attention. ${totalInProgress} issues are still unresolved.
      </div>`;
    }

    const pendingItemsHtml = myPending.length > 0
      ? myPending.map(p => `
        <li style="margin-bottom: 8px;">
          <strong>${p.complaint_id}</strong> — ${p.title}
          <span style="color: #f59e0b;">(${p.days_pending || 0} days pending)</span>
        </li>
      `).join('')
      : '<li>No pending complaints. Thank you for keeping your neighborhood clean!</li>';

    const subject = `📰 Weekly Digest — ${ward} — Week of ${todayStr}`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; background: #0b1329; color: #f8fafc; padding: 24px; border-radius: 12px; max-width: 600px; margin: 0 auto;">
        <div style="border-bottom: 1px solid #1e293b; padding-bottom: 16px; margin-bottom: 20px;">
          <h2 style="color: #60a5fa; margin: 0;">🏛️ CivicTracker Weekly Ward Digest</h2>
          <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">Summary for <strong>${ward}</strong> as of ${todayStr}</p>
        </div>

        ${messageLine}

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 20px;">
          <div style="background: #1e293b; padding: 12px; border-radius: 8px; text-align: center;">
            <div style="font-size: 20px; font-weight: bold; color: #60a5fa;">${totalFiled}</div>
            <div style="font-size: 11px; color: #94a3b8;">Filed This Week</div>
          </div>
          <div style="background: #1e293b; padding: 12px; border-radius: 8px; text-align: center;">
            <div style="font-size: 20px; font-weight: bold; color: #22c55e;">${totalResolved}</div>
            <div style="font-size: 11px; color: #94a3b8;">Resolved</div>
          </div>
          <div style="background: #1e293b; padding: 12px; border-radius: 8px; text-align: center;">
            <div style="font-size: 20px; font-weight: bold; color: #f59e0b;">${totalInProgress}</div>
            <div style="font-size: 11px; color: #94a3b8;">In Progress</div>
          </div>
        </div>

        <p style="font-size: 14px;"><strong>Top Issue Category:</strong> ${topCategory}</p>

        <div style="background: #1e293b; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
          <h4 style="margin-top: 0; color: #f59e0b;">Your Pending Complaints (${myPending.length})</h4>
          <ul style="padding-left: 20px; font-size: 13px; color: #cbd5e1;">
            ${pendingItemsHtml}
          </ul>
        </div>

        <div style="border-top: 1px solid #1e293b; padding-top: 14px; font-size: 11px; color: #64748b; text-align: center;">
          You are receiving this because you are registered in ${ward}. Reply STOP to unsubscribe.
        </div>
      </div>
    `;

    await sendEmail(citizen.email, subject, htmlContent);
    sentCount++;
  }

  console.log(`[Weekly Digest] Digest complete. Sent to ${sentCount} citizens.`);
  return { count: sentCount };
}

function startWeeklyDigestJob() {
  // Schedule every Sunday at 8:00 AM (0 8 * * 0)
  cron.schedule('0 8 * * 0', () => {
    executeWeeklyDigest().catch(err => console.error('[Weekly Digest Error]', err.message));
  });
  console.log('⏰ [Cron] Weekly Ward Digest scheduled for Sundays 8:00 AM');
}

module.exports = { startWeeklyDigestJob, executeWeeklyDigest };
