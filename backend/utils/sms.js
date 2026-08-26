const twilio = require('twilio');

function sendSMS(toPhone, message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

  const maskedPhone = toPhone && toPhone.length >= 4 ? `******${toPhone.slice(-4)}` : 'unknown';

  if (!accountSid || !authToken || !twilioPhone || accountSid.startsWith('AC_your') || authToken.startsWith('your_auth')) {
    console.log(`[SMS Warning] Twilio credentials not configured. Skipped sending SMS to ${maskedPhone}`);
    return Promise.resolve({ skipped: true });
  }

  if (!toPhone || toPhone.replace(/\D/g, '').length < 10) {
    console.log(`[SMS Warning] Invalid recipient phone number (${maskedPhone}). Skipped.`);
    return Promise.resolve({ skipped: true, reason: 'Invalid phone' });
  }

  const client = twilio(accountSid, authToken);

  // Ensure phone number has country code if not present (defaulting +91 for India if 10 digits)
  let formattedPhone = toPhone.trim();
  if (!formattedPhone.startsWith('+')) {
    formattedPhone = `+91${formattedPhone.replace(/\D/g, '').slice(-10)}`;
  }

  return client.messages.create({
    body: message,
    from: twilioPhone,
    to: formattedPhone
  }).then(msg => {
    console.log(`✅ [SMS Success] Sent to ${maskedPhone}. SID: ${msg.sid}`);
    return { success: true, sid: msg.sid };
  }).catch(err => {
    console.error(`❌ [SMS Error] Failed to send to ${maskedPhone}:`, err.message);
    return { success: false, error: err.message };
  });
}

module.exports = { sendSMS };
