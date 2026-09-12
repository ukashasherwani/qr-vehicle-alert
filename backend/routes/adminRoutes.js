const express = require('express');
const adminAuth = require('../middlewares/adminAuth');
const {
  getStats,
  getUsers,
  getUserDetails,
  updateUserStatus,
  getVehicles,
  updateVehicleQrStatus,
  deleteVehicle,
  flagUser,
  getSosLogs,
  getMessageLogs,
} = require('../controllers/adminController');

const router = express.Router();

// Apply admin authentication middleware to all /api/admin endpoints
router.use(adminAuth);

// 1. Overall System Analytics
router.get('/stats', getStats);

// 2. User Management
router.get('/users', getUsers);
router.patch('/users/:id/status', updateUserStatus);
router.get('/users/:id/details', getUserDetails);
router.patch('/users/:id/flag', flagUser);

// 3. Vehicle & QR Status Management
router.get('/vehicles', getVehicles);
router.patch('/vehicles/:id/qr-status', updateVehicleQrStatus);
router.delete('/vehicles/:id', deleteVehicle);

// 4. Emergency SOS Logs
router.get('/sos-logs', getSosLogs);

// 5. Message Moderation & AI Analysis Logs
router.get('/messages', getMessageLogs);

module.exports = router;
