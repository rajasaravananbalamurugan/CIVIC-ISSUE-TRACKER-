const nodemailer = require('nodemailer');

function sendEmail(to, subject, html) {
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_PASSWORD;

  if (!emailUser || !emailPassword || emailUser.includes('your-email@gmail.com')) {
    console.log(`[Email Warning] EMAIL_USER or EMAIL_PASSWORD not set in env. Skipped sending email to ${to}`);
    return Promise.resolve({ skipped: true });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPassword
    }
  });

  return transporter.sendMail({
    from: `"CivicTracker" <${emailUser}>`,
    to,
    subject,
    html
  }).then(info => {
    console.log(`✅ [Email Success] Sent to ${to}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  }).catch(err => {
    console.error(`❌ [Email Error] Failed to send to ${to}:`, err.message);
    return { success: false, error: err.message };
  });
}

module.exports = { sendEmail };
