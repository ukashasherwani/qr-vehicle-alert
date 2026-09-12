const mongoose = require('mongoose');
const crypto = require('crypto');

const titleCase = (value) => value
  .trim()
  .toLowerCase()
  .replace(/\b\w/g, (character) => character.toUpperCase());

const vehicleSchema = new mongoose.Schema({
  ownerClerkId: {
    type: String,
  },
  ownerEmail: {
    type: String,
    required: [true, 'Owner email is required'],
    trim: true,
  },
  ownerPhone: {
    type: String,
    required: [true, 'Phone number is required for SMS emergency alerts'],
    trim: true,
  },
  phoneNumber: {
    type: String,
    select: false,
  },
  plateNumber: {
    type: String,
    required: true,
    unique: true,
    set: (value) => value.trim().toUpperCase(),
  },
  model: {
    type: String,
    required: [true, 'Vehicle model is required'],
    set: (value) => (value ? titleCase(value) : value),
  },
  qrStatus: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE'],
    default: 'ACTIVE',
  },
  qrToken: {
    type: String,
    default: () => crypto.randomBytes(16).toString('hex'),
    unique: true,
  },
  qrCodeUrl: {
    type: String,
  },
  alertCount: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

module.exports = mongoose.model('Vehicle', vehicleSchema);
