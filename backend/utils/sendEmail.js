const nodemailer = require('nodemailer');

const smtpHost = process.env.BREVO_SMTP_HOST || process.env.SMTP_HOST || 'smtp-relay.brevo.com';
const smtpPort = Number(process.env.BREVO_SMTP_PORT || process.env.SMTP_PORT || 587);
const smtpUser = process.env.BREVO_SMTP_USER || process.env.SMTP_USER;
const smtpPass = process.env.BREVO_SMTP_PASS || process.env.SMTP_PASS;

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});

async function sendAlertEmail({ to, phoneNumber, vehiclePlate, issues, customMessage, urgencyLevel, imageUrl }) {
  if (!to) {
    throw new Error('Alert email recipient is missing.');
  }

  const urgencyLabel = urgencyLevel || 'low';
  const subject = `${urgencyLabel === 'high' ? '[URGENT ALERT] ' : ''}Vehicle alert: ${issues || 'New issue reported'}`;
  const imageNotice = imageUrl ? `\nImage evidence: ${imageUrl}` : '';

  console.log('[Email] Sending alert email', {
    to,
    phoneNumber,
    vehiclePlate,
    issues,
    urgencyLevel: urgencyLabel,
    smtpHost,
    smtpPort,
  });

  try {
    const info = await transporter.sendMail({
      from: `"QR Vehicle Alert" <${process.env.SENDER_EMAIL || smtpUser}>`,
      to,
      subject,
      text: [
        `A new issue was reported for vehicle ${vehiclePlate}.`,
        `Issue: ${issues || 'Not specified'}`,
        `Urgency: ${urgencyLabel}`,
        `Message: ${customMessage || 'No additional message provided.'}`,
        imageNotice,
      ].join('\n'),
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
