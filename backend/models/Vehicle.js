const mongoose = require('mongoose');

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
  },
  plateNumber: {
    type: String,
    required: true,
    set: (value) => value.trim().toUpperCase(),
  },
  model: {
    type: String,
    set: (value) => (value ? titleCase(value) : value),
  },
  qrCodeUrl: {
    type: String,
  },
});

module.exports = mongoose.model('Vehicle', vehicleSchema);
