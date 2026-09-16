const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  vehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
  },
  issueType: {
    type: String,
  },
  alertType: {
    type: String,
    enum: ['STANDARD', 'CRITICAL_SOS'],
    default: 'STANDARD',
  },
  message: {
    type: String,
  },
  urgency: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'low',
  },
  imageUrl: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    default: 'pending',
  },
  coordinates: {
    latitude: { type: Number },
    longitude: { type: Number },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Alert', alertSchema);
