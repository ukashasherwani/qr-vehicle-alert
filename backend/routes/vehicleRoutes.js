const express = require('express');
const mongoose = require('mongoose');
const Vehicle = require('../models/Vehicle');

const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const vehicle = await Vehicle.create(req.body);
    res.status(201).json(vehicle);
  } catch (error) {
    next(error);
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
