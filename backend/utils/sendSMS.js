const twilio = require('twilio');

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

async function sendAlertSMS({ to, vehiclePlate, issue, urgencyLevel }) {
  try {
    const message = await twilioClient.messages.create({
      body: [
        `QR Vehicle Alert for ${vehiclePlate}: ${issue || 'New issue reported'}`,
        `Urgency: ${urgencyLevel || 'low'}. Please check your vehicle.`,
      ].join(' '),
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });

    console.log('[SMS] Alert SMS sent successfully:', message.sid);
    return message;
  } catch (error) {
    console.error('[SMS] Failed to send alert SMS:', error.message);
    return null;
  }
}

module.exports = { sendAlertSMS };
