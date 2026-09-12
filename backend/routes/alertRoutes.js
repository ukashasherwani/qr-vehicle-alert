const express = require('express');
const https = require('https');
const cloudinary = require('cloudinary').v2;
const mongoose = require('mongoose');
const multer = require('multer');
const streamifier = require('streamifier');
const Alert = require('../models/Alert');
const Vehicle = require('../models/Vehicle');
const { analyzeUrgency } = require('../utils/aiHelper');
const { sendAlertEmail } = require('../utils/sendEmail');
const { sendAlertSMS } = require('../utils/sendSMS');
const alertRateLimiter = require('../middlewares/rateLimiter');
const adminAuth = require('../middlewares/adminAuth');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    callback(null, file.mimetype.startsWith('image/'));
  },
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadImage = (buffer) => new Promise((resolve, reject) => {
  const stream = cloudinary.uploader.upload_stream(
    { folder: 'qr-vehicle-alert' },
    (error, result) => {
      if (error) reject(error);
      else resolve(result.secure_url);
    },
  );

  streamifier.createReadStream(buffer).pipe(stream);
});

const decodeJwtPayload = (token) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
  } catch {
    return null;
  }
};

const isClerkAdmin = (userId) => new Promise((resolve) => {
  if (!process.env.CLERK_SECRET_KEY || !userId) return resolve(false);

  const request = https.request({
    hostname: 'api.clerk.com',
    path: `/v1/users/${userId}`,
    method: 'GET',
    headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
  }, (response) => {
    let data = '';
    response.on('data', (chunk) => { data += chunk; });
    response.on('end', () => {
      try {
        const user = JSON.parse(data);
        resolve(response.statusCode >= 200 && response.statusCode < 300
          && (user.public_metadata?.role === 'admin' || user.publicMetadata?.role === 'admin'));
      } catch {
        resolve(false);
      }
    });
  });

  request.on('error', () => resolve(false));
  request.end();
});

const ownerOrAdminAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token required' });
    }

    const decoded = decodeJwtPayload(authHeader.slice(7));
    const requesterId = decoded?.sub || decoded?.userId || decoded?.id;
    const role = decoded?.publicMetadata?.role
      || decoded?.public_metadata?.role
      || decoded?.role;

    if (!requesterId) return res.status(401).json({ message: 'Invalid authorization token' });
    if (role === 'admin' || await isClerkAdmin(requesterId)) {
      req.user = { id: requesterId, role: 'admin' };
      return next();
    }

    const alert = await Alert.findById(req.params.id).populate('vehicleId', 'ownerClerkId');
    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    if (alert.vehicleId?.ownerClerkId !== requesterId) {
      return res.status(403).json({ message: 'Only the vehicle owner or an admin can update this alert' });
    }

    req.user = { id: requesterId, role: 'owner' };
    return next();
  } catch (error) {
    return next(error);
  }
};

router.post('/', alertRateLimiter, upload.single('image'), async (req, res, next) => {
  try {
    const { vehicleId, issueType, message, ownerEmail } = req.body;

    if (!mongoose.isValidObjectId(vehicleId)) {
      return res.status(400).json({ message: 'Invalid vehicle ID' });
    }

    if (typeof issueType !== 'string' || !issueType.trim() || issueType.length > 200) {
      return res.status(400).json({ message: 'Please provide a valid issue type.' });
    }

    if (typeof message !== 'string' || message.length > 2000) {
      return res.status(400).json({ message: 'Alert message must be 2,000 characters or fewer.' });
    }

    if (ownerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
      return res.status(400).json({ message: 'Invalid owner email address.' });
    }

    const vehicle = await Vehicle.findById(vehicleId)
      .select('plateNumber ownerEmail ownerPhone phoneNumber ownerClerkId');
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    const recipientEmail = vehicle.ownerEmail;
    const recipientPhone = vehicle.ownerPhone || vehicle.phoneNumber;
    if (!recipientEmail) {
      return res.status(400).json({ message: 'Vehicle owner email is unavailable' });
    }
    if (!recipientPhone) {
      return res.status(400).json({ message: 'Vehicle owner phone number is unavailable' });
    }

    const imageUrl = req.file ? await uploadImage(req.file.buffer) : '';
    const urgency = await analyzeUrgency(message);

    const alert = await Alert.create({
      vehicleId,
      issueType,
      message,
      urgency,
      imageUrl,
    });
    await Vehicle.findByIdAndUpdate(vehicleId, { $inc: { alertCount: 1 } });

    await alert.populate('vehicleId');

    try {
      await sendAlertEmail({
        to: recipientEmail,
        phoneNumber: recipientPhone,
        vehiclePlate: vehicle.plateNumber,
        issues: issueType,
        customMessage: message,
        urgencyLevel: urgency,
        imageUrl,
      });
    } catch (emailError) {
      console.error('[Alert] Alert saved, but owner notification email failed:', emailError.message);
    }

    await sendAlertSMS({
      to: recipientPhone,
      vehiclePlate: vehicle.plateNumber,
      issue: issueType,
      urgencyLevel: urgency,
    });

    req.io.emit('newAlert', {
      alert: alert.toObject(),
      vehicleOwnerClerkId: vehicle.ownerClerkId,
    });

    res.status(201).json(alert);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/status', ownerOrAdminAuth, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid alert ID' });
    if (!['pending', 'resolved', 'dismissed'].includes(status)) return res.status(400).json({ message: 'Invalid alert status' });

    const alert = await Alert.findByIdAndUpdate(req.params.id, { $set: { status } }, { new: true })
      .populate('vehicleId', 'plateNumber model ownerEmail ownerClerkId');
    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    req.io.emit('alertUpdated', { alert: alert.toObject() });
    req.io.emit('alertStatusChanged', { alert: alert.toObject() });
    return res.json({ success: true, data: alert });
  } catch (error) {
    return next(error);
  }
});

router.post('/:id/reanalyze', adminAuth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid alert ID' });
    const alert = await Alert.findById(req.params.id);
    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    alert.urgency = await analyzeUrgency(alert.message || '');
    await alert.save();
    await alert.populate('vehicleId', 'plateNumber model ownerEmail ownerClerkId');
    req.io.emit('alertStatusChanged', { alert: alert.toObject() });
    return res.json({ success: true, data: alert });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', adminAuth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid alert ID' });
    const alert = await Alert.findByIdAndDelete(req.params.id);
    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    req.io.emit('alertDeleted', { alertId: req.params.id });
    return res.json({ success: true, message: 'Alert deleted' });
  } catch (error) {
    return next(error);
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