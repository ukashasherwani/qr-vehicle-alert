const express = require('express');
const mongoose = require('mongoose');
const Vehicle = require('../models/Vehicle');
const crypto = require('crypto');
const adminAuth = require('../middlewares/adminAuth');
const {
  createVehicle,
  getOwnerVehicles,
  updateVehicle,
  deleteVehicle,
} = require('../controllers/vehicleController');

const router = express.Router();

router.post('/', createVehicle);

router.put('/:id', updateVehicle);

router.delete('/:id', deleteVehicle);

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

router.get('/owner/:clerkId', getOwnerVehicles);

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
