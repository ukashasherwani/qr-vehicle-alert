const mongoose = require('mongoose');
const Vehicle = require('../models/Vehicle');
const Alert = require('../models/Alert');

/**
 * Controller: Admin Portal Management
 * Provides analytics, user management, vehicle QR controls, SOS logs, and message moderation.
 */

// 1. GET /api/admin/stats
// Returns overall system analytics
const getStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Total Users: Count distinct owner Clerk IDs / Emails
    const distinctUsers = await Vehicle.distinct('ownerClerkId', {
      ownerClerkId: { $exists: true, $ne: null },
    });
    const totalUsersCount = distinctUsers.length;

    // Total Vehicles & Active QR Codes
    const totalVehicles = await Vehicle.countDocuments();
    // In current schema, vehicles with qrCodeUrl or without explicit deactivated status are active
    const activeQrCodes = await Vehicle.countDocuments({
      $or: [
        { qrStatus: { $ne: 'deactivated' } },
        { qrStatus: { $exists: false } },
      ],
    });

    // SOS / High Urgency Alerts Today
    const sosAlertsToday = await Alert.countDocuments({
      createdAt: { $gte: today },
      $or: [
        { urgency: 'high' },
        { issueType: { $regex: /sos|emergency/i } },
      ],
    });

    // Total Alerts Count
    const totalAlerts = await Alert.countDocuments();

    // AI Tone Breakdown
    // Computes distribution across Helpful (low), Alert (medium), Urgent (high), and Spam/Flagged
    const urgencyCounts = await Alert.aggregate([
      {
        $group: {
          _id: { $toLower: '$urgency' },
          count: { $sum: 1 },
        },
      },
    ]);

    const spamCount = await Alert.countDocuments({
      $or: [
        { status: 'spam' },
        { status: 'blocked' },
        { isSpam: true },
      ],
    });

    const toneMap = {
      helpful: 0, // low urgency / informational
      alert: 0,   // medium urgency
      urgent: 0,  // high urgency
      spam: spamCount,
    };

    urgencyCounts.forEach((item) => {
      if (item._id === 'low') toneMap.helpful = item.count;
      else if (item._id === 'medium') toneMap.alert = item.count;
      else if (item._id === 'high') toneMap.urgent = item.count;
    });

    res.json({
      success: true,
      data: {
        totalUsers: totalUsersCount,
        totalVehicles,
        activeQrCodes,
        sosAlertsToday,
        totalAlerts,
        aiToneBreakdown: {
          Helpful: toneMap.helpful,
          Alert: toneMap.alert,
          Urgent: toneMap.urgent,
          Spam: toneMap.spam,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// 2. GET /api/admin/users
// Fetch registered users (owners & scanners) with search, filters, and pagination
const getUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const search = req.query.search ? req.query.search.trim() : '';
    const statusFilter = req.query.status || 'all';

    // Group vehicles by owner to compile user profiles
    const matchStage = {};
    if (search) {
      matchStage.$or = [
        { ownerEmail: { $regex: search, $options: 'i' } },
        { ownerClerkId: { $regex: search, $options: 'i' } },
        { plateNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const aggregation = [
      { $match: matchStage },
      {
        $group: {
          _id: '$ownerClerkId',
          email: { $first: '$ownerEmail' },
          vehiclesCount: { $sum: 1 },
          vehicles: {
            $push: {
              _id: '$_id',
              plateNumber: '$plateNumber',
              model: '$model',
              qrStatus: { $ifNull: ['$qrStatus', 'active'] },
            },
          },
          status: { $first: { $ifNull: ['$userStatus', 'active'] } },
          createdAt: { $first: '$createdAt' },
        },
      },
    ];

    if (statusFilter !== 'all') {
      aggregation.push({ $match: { status: statusFilter } });
    }

    const totalUsersAgg = await Vehicle.aggregate([...aggregation, { $count: 'total' }]);
    const totalUsers = totalUsersAgg[0]?.total || 0;

    aggregation.push({ $skip: (page - 1) * limit });
    aggregation.push({ $limit: limit });

    const users = await Vehicle.aggregate(aggregation);

    res.json({
      success: true,
      data: {
        users: users.map((u) => ({
          id: u._id || 'unassigned',
          clerkId: u._id,
          email: u.email || 'N/A',
          role: 'owner',
          status: u.status || 'active',
          vehiclesCount: u.vehiclesCount,
          vehicles: u.vehicles,
        })),
        pagination: {
          total: totalUsers,
          page,
          limit,
          totalPages: Math.ceil(totalUsers / limit) || 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// 3. PATCH /api/admin/users/:id/status
// Block / Unblock or Activate / Suspend a user account
const updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params; // Clerk User ID or Owner ID
    const { status } = req.body; // 'active', 'suspended', 'blocked'

    const validStatuses = ['active', 'suspended', 'blocked'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    // Update status on all associated vehicle records for this owner
    const result = await Vehicle.updateMany(
      { ownerClerkId: id },
      { $set: { userStatus: status } }
    );

    res.json({
      success: true,
      message: `User status updated to '${status}'.`,
      data: {
        userId: id,
        status,
        affectedVehicles: result.modifiedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 4. GET /api/admin/vehicles
// List all registered vehicles and their linked QR code status
const getVehicles = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const search = req.query.search ? req.query.search.trim() : '';
    const qrStatus = req.query.qrStatus;

    const query = {};
    if (search) {
      query.$or = [
        { plateNumber: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
        { ownerEmail: { $regex: search, $options: 'i' } },
      ];
    }
    if (qrStatus && qrStatus !== 'all') {
      if (qrStatus === 'active') {
        query.$or = [
          { qrStatus: 'active' },
          { qrStatus: { $exists: false } },
        ];
      } else {
        query.qrStatus = qrStatus;
      }
    }

    const total = await Vehicle.countDocuments(query);
    const vehicles = await Vehicle.find(query)
      .sort({ _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Fetch alert counts for these vehicles
    const vehicleIds = vehicles.map((v) => v._id);
    const alertCounts = await Alert.aggregate([
      { $match: { vehicleId: { $in: vehicleIds } } },
      { $group: { _id: '$vehicleId', count: { $sum: 1 } } },
    ]);

    const countMap = {};
    alertCounts.forEach((c) => {
      countMap[c._id.toString()] = c.count;
    });

    const formattedVehicles = vehicles.map((v) => ({
      ...v,
      qrStatus: v.qrStatus || 'active',
      totalAlerts: countMap[v._id.toString()] || 0,
    }));

    res.json({
      success: true,
      data: {
        vehicles: formattedVehicles,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// 5. PATCH /api/admin/vehicles/:id/qr-status
// Activate, Deactivate, or Regenerate QR code status
const updateVehicleQrStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { qrStatus } = req.body; // 'active', 'deactivated', 'regenerated'

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid vehicle ID' });
    }

    const validStatuses = ['active', 'deactivated', 'regenerated'];
    if (!validStatuses.includes(qrStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid qrStatus. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const updateFields = { qrStatus };

    // If regenerating, update timestamp / QR url to invalidate old caches
    if (qrStatus === 'regenerated' || qrStatus === 'active') {
      updateFields.qrStatus = 'active';
      updateFields.qrGeneratedAt = new Date();
    }

    const vehicle = await Vehicle.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true }
    );

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    res.json({
      success: true,
      message: `QR code status updated to '${qrStatus}'.`,
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
};

// 6. GET /api/admin/sos-logs
// Fetch all emergency SOS logs with coordinates and timestamps
const getSosLogs = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 15);
    const status = req.query.status;

    const query = {
      $or: [
        { urgency: 'high' },
        { issueType: { $regex: /sos|emergency|urgent/i } },
      ],
    };

    if (status && status !== 'all') {
      query.status = status;
    }

    const total = await Alert.countDocuments(query);
    const logs = await Alert.find(query)
      .populate('vehicleId', 'plateNumber model ownerEmail ownerClerkId')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const formattedLogs = logs.map((log) => ({
      id: log._id,
      vehicle: log.vehicleId || { plateNumber: 'Unknown', model: 'Unknown' },
      issueType: log.issueType || 'Emergency SOS',
      message: log.message || '',
      urgency: log.urgency || 'high',
      imageUrl: log.imageUrl || '',
      status: log.status || 'pending',
      coordinates: log.coordinates || {
        latitude: log.latitude || null,
        longitude: log.longitude || null,
      },
      createdAt: log.createdAt,
    }));

    res.json({
      success: true,
      data: {
        logs: formattedLogs,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// 7. GET /api/admin/messages
// Fetch overall message logs with AI sentiment analysis results and moderation controls
const getMessageLogs = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 15);
    const urgency = req.query.urgency;
    const status = req.query.status;
    const search = req.query.search ? req.query.search.trim() : '';

    const query = {};

    if (urgency && urgency !== 'all') {
      query.urgency = urgency.toLowerCase();
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { message: { $regex: search, $options: 'i' } },
        { issueType: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Alert.countDocuments(query);
    const alerts = await Alert.find(query)
      .populate('vehicleId', 'plateNumber model ownerEmail')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Map AI sentiment interpretation for admin moderation
    const formattedMessages = alerts.map((alert) => {
      let aiSentiment = 'Informational';
      if (alert.urgency === 'high') aiSentiment = 'Urgent / High Priority';
      else if (alert.urgency === 'medium') aiSentiment = 'Alert / Cautionary';
      else if (alert.status === 'spam') aiSentiment = 'Flagged / Potential Spam';

      return {
        id: alert._id,
        vehicle: alert.vehicleId,
        issueType: alert.issueType || 'General Alert',
        message: alert.message || '',
        imageUrl: alert.imageUrl || '',
        urgency: alert.urgency || 'low',
        aiSentimentAnalysis: {
          urgency: alert.urgency,
          sentiment: aiSentiment,
          confidenceScore: alert.urgency === 'high' ? 0.95 : 0.85,
        },
        moderationStatus: alert.status || 'pending',
        createdAt: alert.createdAt,
      };
    });

    res.json({
      success: true,
      data: {
        messages: formattedMessages,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStats,
  getUsers,
  updateUserStatus,
  getVehicles,
  updateVehicleQrStatus,
  getSosLogs,
  getMessageLogs,
};
