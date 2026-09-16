const express = require('express');
const mongoose = require('mongoose');
const Alert = require('../models/Alert');
const Vehicle = require('../models/Vehicle');
const alertRateLimiter = require('../middlewares/rateLimiter');
const adminAuth = require('../middlewares/adminAuth');
const { sendAlertEmail } = require('../utils/sendEmail');
const { sendAlertSMS } = require('../utils/sendSMS');

const router = express.Router();

const decodeJwtPayload = (token) => {
  try {
    const parts = token.split('.');
    return parts.length === 3 ? JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8')) : null;
  } catch {
    return null;
  }
};

const ownerOrAdminAuth = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid SOS ID' });
    const token = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : '';
    const decoded = decodeJwtPayload(token);
    const requesterId = decoded?.sub || decoded?.userId || decoded?.id;
    const role = decoded?.publicMetadata?.role || decoded?.public_metadata?.role || decoded?.role;
    const isSecretAdmin = req.headers['x-admin-secret']
      && process.env.ADMIN_SECRET_KEY
      && req.headers['x-admin-secret'] === process.env.ADMIN_SECRET_KEY;
    if (!requesterId && !isSecretAdmin) return res.status(401).json({ message: 'Authorization token required' });

    const alert = await Alert.findById(req.params.id).populate('vehicleId', 'ownerClerkId');
    if (!alert) return res.status(404).json({ message: 'SOS alert not found' });
    if (!isSecretAdmin && role !== 'admin' && alert.vehicleId?.ownerClerkId !== requesterId) {
      return res.status(403).json({ message: 'Only the vehicle owner or an admin can resolve this SOS' });
    }
    req.user = { id: requesterId, role: isSecretAdmin || role === 'admin' ? 'admin' : 'owner' };
    return next();
  } catch (error) {
    return next(error);
  }
};

router.post('/trigger', alertRateLimiter, async (req, res, next) => {
  try {
    const { vehicleId, qrToken, vehiclePlate, latitude, longitude, locationText, userNote } = req.body;
    if (![vehicleId, qrToken, vehiclePlate].some((value) => typeof value === 'string' && value.trim())) {
      return res.status(400).json({ message: 'Vehicle ID, QR token, or plate is required.' });
    }
    const hasCoordinates = latitude !== undefined && longitude !== undefined;
    if (hasCoordinates && (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude)))) {
      return res.status(400).json({ message: 'Location coordinates must be valid numbers.' });
    }

    const lookup = [];
    if (mongoose.isValidObjectId(vehicleId)) lookup.push({ _id: vehicleId.trim() });
    if (typeof qrToken === 'string' && qrToken.trim()) lookup.push({ qrToken: qrToken.trim() });
    if (typeof vehiclePlate === 'string' && vehiclePlate.trim()) {
      const escapedPlate = vehiclePlate.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      lookup.push({ plateNumber: { $regex: `^${escapedPlate}$`, $options: 'i' } });
    }
    const vehicle = await Vehicle.findOne({ $or: lookup })
      .select('plateNumber ownerEmail ownerPhone phoneNumber ownerClerkId model');
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found.' });

    const message = userNote?.trim() || locationText?.trim() || 'Emergency SOS triggered from the public vehicle scan.';
    const alert = await Alert.create({
      vehicleId: vehicle._id,
      alertType: 'CRITICAL_SOS',
      issueType: 'CRITICAL_SOS',
      message,
      urgency: 'high',
      status: 'active',
      coordinates: hasCoordinates ? { latitude: Number(latitude), longitude: Number(longitude) } : undefined,
    });
    await alert.populate('vehicleId', 'plateNumber model ownerEmail ownerPhone ownerClerkId');

    const smsMessage = `[CRITICAL SOS] Emergency alert triggered for vehicle ${vehicle.plateNumber}! Immediate action required.`;
    const recipientPhone = vehicle.ownerPhone || vehicle.phoneNumber;
    if (recipientPhone) {
      try {
        await sendAlertSMS({ to: recipientPhone, vehiclePlate: vehicle.plateNumber, message: smsMessage });
      } catch (smsError) {
        console.error('[SOS] Alert saved, but owner notification SMS failed:', smsError.message);
      }
    }
    if (vehicle.ownerEmail) {
      try {
        await sendAlertEmail({
          to: vehicle.ownerEmail,
          phoneNumber: recipientPhone,
          vehiclePlate: vehicle.plateNumber,
          issues: 'CRITICAL SOS',
          customMessage: `${smsMessage}\n${message}`,
          urgencyLevel: 'high',
          subject: `[CRITICAL SOS] Emergency alert for vehicle ${vehicle.plateNumber}`,
        });
      } catch (emailError) {
        console.error('[SOS] Alert saved, but owner notification email failed:', emailError.message);
      }
    }

    req.io.emit('sosEmergencyAlert', { alert: alert.toObject() });
    return res.status(201).json({ success: true, data: alert });
  } catch (error) {
    return next(error);
  }
});

router.patch('/:id/resolve', ownerOrAdminAuth, async (req, res, next) => {
  try {
    const status = req.body.status === 'dismissed' ? 'dismissed' : 'resolved';
    const alert = await Alert.findOneAndUpdate(
      { _id: req.params.id, alertType: 'CRITICAL_SOS' },
      { $set: { status } },
      { new: true },
    ).populate('vehicleId', 'plateNumber model ownerEmail ownerPhone ownerClerkId');
    if (!alert) return res.status(404).json({ message: 'SOS alert not found' });
    req.io.emit('sosAlertUpdated', { alert: alert.toObject() });
    return res.json({ success: true, data: alert });
  } catch (error) {
    return next(error);
  }
});

router.get('/', adminAuth, async (req, res, next) => {
  try {
    const alerts = await Alert.find({ alertType: 'CRITICAL_SOS' })
      .populate('vehicleId', 'plateNumber model ownerEmail ownerPhone ownerClerkId')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return res.json({ success: true, data: alerts });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;