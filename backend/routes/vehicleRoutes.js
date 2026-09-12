const express = require('express');
const mongoose = require('mongoose');
const Vehicle = require('../models/Vehicle');
const Alert = require('../models/Alert');
const crypto = require('crypto');
const adminAuth = require('../middlewares/adminAuth');

const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const vehicle = await Vehicle.create({
      ...req.body,
      ownerPhone: req.body.ownerPhone || req.body.phoneNumber,
      phoneNumber: undefined,
    });
    res.status(201).json(vehicle);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/status', adminAuth, async (req, res, next) => {
  try {
    const qrStatus = String(req.body.qrStatus || '').toUpperCase();
    if (!['ACTIVE', 'INACTIVE'].includes(qrStatus)) {
      return res.status(400).json({ message: 'QR status must be ACTIVE or INACTIVE' });
    }
    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, { $set: { qrStatus } }, { new: true });
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    return res.json({ success: true, data: vehicle });
  } catch (error) {
    return next(error);
  }
});

router.post('/:id/regenerate', adminAuth, async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      { $set: { qrToken: crypto.randomBytes(16).toString('hex'), qrStatus: 'ACTIVE' } },
      { new: true },
    );
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    return res.json({ success: true, data: vehicle });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', adminAuth, async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findByIdAndDelete(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    await Alert.deleteMany({ vehicleId: req.params.id });
    return res.json({ success: true, message: 'Vehicle deleted' });
  } catch (error) {
    return next(error);
  }
});

router.get('/owner/:clerkId', async (req, res, next) => {
  try {
    const vehicles = await Vehicle.find({ ownerClerkId: req.params.clerkId });
    res.json(vehicles);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid vehicle ID' });
    }

    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    res.json(vehicle);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
