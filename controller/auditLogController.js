const AuditLog = require('../model/AuditLog');
const Vendor = require("../model/vendor");
const Driver = require("../model/driverModel");
const Worker = require("../model/workerModel");
const mongoose = require("mongoose");

const getManagedEntityIds = async (supervisorId) => {
  const [managedVendors, managedWorkers, managedDrivers] = await Promise.all([
    Vendor.find({ supervisorId }).select('_id'),
    Worker.find({ supervisor: supervisorId }).select('_id'),
    Driver.find({ supervisor: supervisorId }).select('_id')
  ]);
  return [
    new mongoose.Types.ObjectId(supervisorId),
    ...managedVendors.map(v => v._id),
    ...managedWorkers.map(w => w._id),
    ...managedDrivers.map(d => d._id)
  ];
};
const buildAuditLogQuery = (query, filters) => {
  const { module, fromDate, toDate, search } = filters;

  if (module) query.module = module;

  if (fromDate || toDate) {
    query.createdAt = {};
    if (fromDate) query.createdAt.$gte = new Date(fromDate);
    if (toDate) query.createdAt.$lte = new Date(new Date(toDate).setHours(23, 59, 59, 999));
  }

  if (search) {
    query.$or = [
      { action: { $regex: search, $options: 'i' } },
      { module: { $regex: search, $options: 'i' } },

    ];
  }

  return query;
};
exports.getAuditLogs = async (req, res) => {
  try {
    const { role, id } = req.user;
    const { page = 1, limit = 20, search } = req.query;

    let query = {};
    if (role === 'user') {
      const allowedIds = await getManagedEntityIds(id);
      query.userId = { $in: allowedIds };
    } else if (role !== 'superadmin') {
      query.userId = new mongoose.Types.ObjectId(id);
    }
    
    // Apply date/module filters here (but NOT search)
    query = buildAuditLogQuery(query, req.query); 

    const pipeline = [
      { $match: query },
      { $sort: { createdAt: -1 } },
      { $lookup: { from: 'vendors', localField: 'userId', foreignField: '_id', as: 'vendor' } },
      { $lookup: { from: 'workers', localField: 'userId', foreignField: '_id', as: 'worker' } },
      { $lookup: { from: 'drivers', localField: 'userId', foreignField: '_id', as: 'driver' } },
      {
        $addFields: {
          userName: {
            $switch: {
              branches: [
                { case: { $eq: ["$userType", "vendor"] }, then: { $arrayElemAt: ["$vendor.vendorName", 0] } },
                { case: { $eq: ["$userType", "worker"] }, then: { $arrayElemAt: ["$worker.name", 0] } },
                { case: { $eq: ["$userType", "driver"] }, then: { $arrayElemAt: ["$driver.name", 0] } },
                { case: { $eq: ["$userType", "superadmin"] }, then: "Super Admin" },
                { case: { $eq: ["$userType", "user"] }, then: "Supervisor" }
              ],
              default: "System/Other"
            }
          }
        }
      },
      // This stage filters everything including userName
      ...(search ? [{ 
        $match: { 
          $or: [
            { action: { $regex: search, $options: 'i' } },
            { module: { $regex: search, $options: 'i' } },
            { userName: { $regex: search, $options: 'i' } }
          ] 
        } 
      }] : []),
      // Facet handles counting and pagination in one pass
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [
            { $skip: (parseInt(page) - 1) * parseInt(limit) },
            { $limit: parseInt(limit) },
            { $project: { vendor: 0, worker: 0, driver: 0 } }
          ]
        }
      }
    ];

    const result = await AuditLog.aggregate(pipeline);
    const logs = result[0].data;
    const total = result[0].metadata[0] ? result[0].metadata[0].total : 0;

    const limitInt = parseInt(limit);
    res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      limit: limitInt,
      totalPages: Math.ceil(total / limitInt),
      count: logs.length,
      data: logs
    });
  } catch (error) {
    res.status(500).json({ message: "Error", error: error.message });
  }
};