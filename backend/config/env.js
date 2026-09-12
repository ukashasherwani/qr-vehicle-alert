const requiredEnvironmentVariables = [
  ['MONGODB_URI', 'MONGODB_URI or legacy MONGO_URI'],
  ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_CLOUD_NAME'],
  ['CLOUDINARY_API_KEY', 'CLOUDINARY_API_KEY'],
  ['CLOUDINARY_API_SECRET', 'CLOUDINARY_API_SECRET'],
  ['BREVO_SMTP_HOST', 'BREVO_SMTP_HOST or legacy SMTP_HOST'],
  ['BREVO_SMTP_PORT', 'BREVO_SMTP_PORT or legacy SMTP_PORT'],
  ['BREVO_SMTP_USER', 'BREVO_SMTP_USER or legacy SMTP_USER'],
  ['BREVO_SMTP_PASS', 'BREVO_SMTP_PASS or legacy SMTP_PASS'],
  ['SENDER_EMAIL', 'BREVO SENDER_EMAIL'],
  ['GEMINI_API_KEY', 'GEMINI_API_KEY'],
  ['CLERK_SECRET_KEY', 'CLERK_SECRET_KEY'],
  ['TWILIO_ACCOUNT_SID', 'TWILIO_ACCOUNT_SID'],
  ['TWILIO_AUTH_TOKEN', 'TWILIO_AUTH_TOKEN'],
  ['TWILIO_PHONE_NUMBER', 'TWILIO_PHONE_NUMBER'],
];

const getMongoUri = () => process.env.MONGODB_URI || process.env.MONGO_URI;
const getEnvironmentValue = (variable) => {
  if (variable === 'BREVO_SMTP_HOST') return process.env.BREVO_SMTP_HOST || process.env.SMTP_HOST;
  if (variable === 'BREVO_SMTP_PORT') return process.env.BREVO_SMTP_PORT || process.env.SMTP_PORT;
  if (variable === 'BREVO_SMTP_USER') return process.env.BREVO_SMTP_USER || process.env.SMTP_USER;
  if (variable === 'BREVO_SMTP_PASS') return process.env.BREVO_SMTP_PASS || process.env.SMTP_PASS;
  return process.env[variable];
};

const validateEnvironment = () => {
  const missing = requiredEnvironmentVariables
    .filter(([variable]) => {
      if (variable === 'MONGODB_URI') return !getMongoUri();
      return !getEnvironmentValue(variable);
    })
    .map(([, description]) => description);

  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return missing;
};

module.exports = { getMongoUri, validateEnvironment };
