const nodemailer = require('nodemailer');
const https = require('https');

const smtpHost = process.env.BREVO_SMTP_HOST || process.env.SMTP_HOST || 'smtp-relay.brevo.com';
const smtpPort = Number(process.env.BREVO_SMTP_PORT || process.env.SMTP_PORT || 587);
const smtpUser = process.env.BREVO_SMTP_USER || process.env.SMTP_USER;
const smtpPass = process.env.BREVO_SMTP_PASS || process.env.SMTP_PASS;
const brevoApiKey = process.env.BREVO_API_KEY;

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});

const sendViaBrevoApi = ({ to, subject, text }) => new Promise((resolve, reject) => {
  const payload = JSON.stringify({
    sender: {
      email: process.env.SENDER_EMAIL || smtpUser,
      name: 'QR Vehicle Alert',
    },
    to: [{ email: to }],
    subject,
    textContent: text,
  });

  const request = https.request({
    hostname: 'api.brevo.com',
    path: '/v3/smtp/email',
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': brevoApiKey,
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(payload),
    },
  }, (response) => {
    let responseBody = '';
    response.setEncoding('utf8');
    response.on('data', (chunk) => { responseBody += chunk; });
    response.on('end', () => {
      if (response.statusCode >= 200 && response.statusCode < 300) {
        resolve({ response: responseBody, accepted: [to] });
        return;
      }

      const error = new Error(`Brevo API returned HTTP ${response.statusCode}: ${responseBody}`);
      error.responseCode = response.statusCode;
      reject(error);
    });
  });

  request.setTimeout(15000, () => request.destroy(new Error('Brevo API request timed out')));
  request.on('error', reject);
  request.write(payload);
  request.end();
});

async function sendAlertEmail({ to, phoneNumber, vehiclePlate, issues, customMessage, urgencyLevel, imageUrl, subject: customSubject }) {
  if (!to) {
    throw new Error('Alert email recipient is missing.');
  }

  const urgencyLabel = urgencyLevel || 'low';
  const subject = customSubject || `${urgencyLabel === 'high' ? '[URGENT ALERT] ' : ''}Vehicle alert: ${issues || 'New issue reported'}`;
  const imageNotice = imageUrl ? `\nImage evidence: ${imageUrl}` : '';

  const emailText = [
    `A new issue was reported for vehicle ${vehiclePlate}.`,
    `Issue: ${issues || 'Not specified'}`,
    `Urgency: ${urgencyLabel}`,
    `Message: ${customMessage || 'No additional message provided.'}`,
    imageNotice,
  ].join('\n');

  console.log('[Email] Sending alert email', {
    to,
    phoneNumber,
    vehiclePlate,
    issues,
    urgencyLevel: urgencyLabel,
    smtpHost,
    transport: brevoApiKey ? 'brevo-api' : 'smtp',
    smtpHost: brevoApiKey ? undefined : smtpHost,
    smtpPort: brevoApiKey ? undefined : smtpPort,
  });

  try {
    const info = brevoApiKey
      ? await sendViaBrevoApi({ to, subject, text: emailText })
      : await transporter.sendMail({
        from: `"QR Vehicle Alert" <${process.env.SENDER_EMAIL || smtpUser}>`,
        to,
        subject,
        text: emailText,
      });

    console.log('[Email] Alert email sent successfully', {
      messageId: info.messageId,
      response: info.response,
      accepted: info.accepted,
      rejected: info.rejected,
    });

    return info;
  } catch (error) {
    console.error('[Email] Failed to send alert email', {
      message: error.message,
      code: error.code,
      response: error.response,
      responseCode: error.responseCode,
      command: error.command,
    });
    throw error;
  }
}

module.exports = { sendAlertEmail };
