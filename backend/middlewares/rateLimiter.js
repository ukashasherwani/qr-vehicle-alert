const { rateLimit } = require('express-rate-limit');

const alertRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    message: 'Too many alerts submitted from this device. Please try again in 15 minutes.',
  },
});

module.exports = alertRateLimiter;