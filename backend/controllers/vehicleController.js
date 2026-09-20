const mongoose = require('mongoose');
const Vehicle = require('../models/Vehicle');

const normalizePlateNumber = (plateNumber) => String(plateNumber || '').trim().toUpperCase();

const getOwnerId = (req) => req.body.ownerClerkId || req.query.ownerClerkId;

const createVehicle = async (req, res, next) => {
  try {
    const plateNumber = normalizePlateNumber(req.body.plateNumber);
    const activeVehicle = await Vehicle.findOne({ plateNumber, isDeleted: false }).lean();
    if (activeVehicle) {
      return res.status(400).json({ message: 'An active vehicle already uses this plate number.' });
    }

    const vehicle = await Vehicle.create({
      ...req.body,
      plateNumber,
      ownerPhone: req.body.ownerPhone || req.body.phoneNumber,
      phoneNumber: undefined,
      isDeleted: false,
    });
    return res.status(201).json(vehicle);
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.plateNumber) {
      return res.status(400).json({ message: 'An active vehicle already uses this plate number.' });
    }
    return next(error);
  }
};

const getOwnerVehicles = async (req, res, next) => {
  try {
    const vehicles = await Vehicle.find({
      ownerClerkId: req.params.clerkId,
      isDeleted: false,
    });
    return res.json(vehicles);
  } catch (error) {
    return next(error);
  }
};

const updateVehicle = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid vehicle ID' });
    }

    const ownerClerkId = getOwnerId(req);
    if (!ownerClerkId) {
      return res.status(400).json({ message: 'Owner ID is required.' });
    }

    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      ownerClerkId,
      isDeleted: false,
    });
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    const plateNumber = req.body.plateNumber === undefined
      ? vehicle.plateNumber
      : normalizePlateNumber(req.body.plateNumber);
    const conflictingVehicle = await Vehicle.findOne({
      _id: { $ne: vehicle._id },
      plateNumber,
      isDeleted: false,
    }).lean();
    if (conflictingVehicle) {
      return res.status(400).json({ message: 'An active vehicle already uses this plate number.' });
    }

    vehicle.plateNumber = plateNumber;
    if (req.body.model !== undefined || req.body.makeModel !== undefined) {
      vehicle.model = req.body.makeModel ?? req.body.model;
    }
    if (req.body.ownerPhone !== undefined) vehicle.ownerPhone = req.body.ownerPhone;
    await vehicle.save();
    return res.json(vehicle);
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.plateNumber) {
      return res.status(400).json({ message: 'An active vehicle already uses this plate number.' });
    }
    return next(error);
  }
};

const deleteVehicle = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid vehicle ID' });
    }

    const ownerClerkId = getOwnerId(req);
    if (!ownerClerkId) {
      return res.status(400).json({ message: 'Owner ID is required.' });
    }

    const vehicle = await Vehicle.findOneAndUpdate(
      { _id: req.params.id, ownerClerkId, isDeleted: false },
      { $set: { isDeleted: true } },
      { new: true },
    );
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    return res.json({ success: true, message: 'Vehicle deleted', data: vehicle });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createVehicle,
  getOwnerVehicles,
  updateVehicle,
  deleteVehicle,
};