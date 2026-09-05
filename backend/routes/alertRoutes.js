const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const Alert = require('../models/Alert');
const Vehicle = require('../models/Vehicle');

const router = express.Router();

// Brevo Transporter Configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER, // Your Brevo Login Email
    pass: process.env.SMTP_PASS, // Your Brevo SMTP Key
  },
});

router.post('/', async (req, res, next) => {
  try {
    const { vehicleId, issueType, message, ownerEmail } = req.body;

    if (!mongoose.isValidObjectId(vehicleId)) {
      return res.status(400).json({ message: 'Invalid vehicle ID' });
    }

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    const recipientEmail = ownerEmail || vehicle.ownerEmail;
    if (!recipientEmail) {
      return res.status(400).json({ message: 'Vehicle owner email is unavailable' });
    }

    const alert = await Alert.create({
      vehicleId,
      issueType,
      message,
    });

    await transporter.sendMail({
      from: `"QR Vehicle Alert" <${process.env.SENDER_EMAIL}>`,
      to: recipientEmail,
      subject: `Vehicle alert: ${issueType || 'New issue reported'}`,
      text: [
        `A new issue was reported for vehicle ${vehicle.plateNumber}.`,
        `Issue: ${issueType || 'Not specified'}`,
        `Message: ${message || 'No additional message provided.'}`,
      ].join('\n'),
    });

    res.status(201).json(alert);
  } catch (error) {
    next(error);
  }
});

router.get('/owner/:clerkId', async (req, res, next) => {
  try {
    const vehicles = await Vehicle.find({ ownerClerkId: req.params.clerkId }).select('_id');
    const vehicleIds = vehicles.map((vehicle) => vehicle._id);
    const alerts = await Alert.find({ vehicleId: { $in: vehicleIds } })
      .populate('vehicleId')
      .sort({ createdAt: -1 });

    res.json(alerts);
  } catch (error) {
    next(error);
  }
});

module.exports = router;