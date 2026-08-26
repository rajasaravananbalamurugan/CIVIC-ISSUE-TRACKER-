const nodemailer = require('nodemailer');

// Build transporter only if email env vars are set
function createTransport() {
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_SECURE } = process.env;
  if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) return null;

  return nodemailer.createTransport({
    host: EMAIL_HOST,
    port: parseInt(EMAIL_PORT) || 587,
    secure: EMAIL_SECURE === 'true',
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    tls: { rejectUnauthorized: false },
  });
}

const transporter = createTransport();

const STATUS_COLOR = {
  'Pending':     '#f59e0b',
  'In Progress': '#3b82f6',
  'Resolved':    '#22c55e',
  'Rejected':    '#ef4444',
};

const STATUS_EMOJI = {
  'Pending':     '⏳',
  'In Progress': '🔧',
  'Resolved':    '✅',
  'Rejected':    '❌',
};

/**
 * Send an email notification when a complaint's status changes.
 */
async function sendStatusChangeEmail({ toEmail, toName, complaintId, complaintTitle, newStatus, oldStatus, resolutionNote }) {
  if (!transporter) {
    console.log(`[Email] Not configured — skipping email to ${toEmail}`);
    return;
  }

  const color = STATUS_COLOR[newStatus] || '#64748b';
  const emoji = STATUS_EMOJI[newStatus] || '📋';
  const fromName = process.env.EMAIL_FROM || 'CivicTracker <no-reply@civictracker.gov.in>';

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8" /></head>
    <body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 16px;">
        <tr><td align="center">
          <table width="580" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">

            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#1d4ed8,#0d9488);padding:28px 32px;text-align:center;">
                <div style="font-size:28px;margin-bottom:8px;">🏛️</div>
                <div style="font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.5px;">CivicTracker</div>
                <div style="font-size:13px;color:rgba(255,255,255,0.7);margin-top:4px;">Issue Resolution System</div>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:32px;">
                <p style="color:#94a3b8;font-size:15px;margin:0 0 20px;">Hi ${toName},</p>
                <p style="color:#e2e8f0;font-size:15px;line-height:1.6;margin:0 0 24px;">
                  Your complaint status has been updated. Here are the details:
                </p>

                <!-- Complaint ID Box -->
                <div style="background:#0f172a;border-radius:10px;padding:18px 20px;margin-bottom:20px;border-left:4px solid ${color};">
                  <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">Complaint ID</div>
                  <div style="font-size:16px;font-weight:700;color:#60a5fa;font-family:monospace;">${complaintId}</div>
                  <div style="font-size:14px;color:#cbd5e1;margin-top:6px;">${complaintTitle}</div>
                </div>

                <!-- Status Change -->
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                  <tr>
                    <td width="48%" style="background:#0f172a;border-radius:10px;padding:16px;text-align:center;">
                      <div style="font-size:11px;color:#64748b;margin-bottom:6px;text-transform:uppercase;">Previous Status</div>
                      <div style="font-size:15px;font-weight:600;color:#94a3b8;">${oldStatus || 'N/A'}</div>
                    </td>
                    <td width="4%" style="text-align:center;color:#60a5fa;font-size:20px;">→</td>
                    <td width="48%" style="background:#0f172a;border-radius:10px;padding:16px;text-align:center;border:2px solid ${color}40;">
                      <div style="font-size:11px;color:#64748b;margin-bottom:6px;text-transform:uppercase;">New Status</div>
                      <div style="font-size:18px;font-weight:700;color:${color};">${emoji} ${newStatus}</div>
                    </td>
                  </tr>
                </table>

                ${resolutionNote ? `
                <div style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.25);border-radius:10px;padding:16px;margin-bottom:20px;">
                  <div style="font-size:12px;color:#22c55e;font-weight:600;margin-bottom:6px;">✅ Resolution Note</div>
                  <div style="font-size:14px;color:#d1fae5;line-height:1.6;">${resolutionNote}</div>
                </div>` : ''}

                <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0;">
                  You can view the full details and status history by logging into the CivicTracker portal.
                  If you have questions, please leave a comment on your complaint.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
                <div style="font-size:12px;color:#475569;">
                  This is an automated notification from CivicTracker · Do not reply to this email
                </div>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: fromName,
      to: toEmail,
      subject: `${emoji} Complaint ${complaintId} — Status Updated to ${newStatus}`,
      html,
    });
    console.log(`[Email] Sent status change email to ${toEmail} for ${complaintId}`);
  } catch (err) {
    console.error(`[Email] Failed to send email to ${toEmail}:`, err.message);
  }
}

module.exports = { sendStatusChangeEmail };
