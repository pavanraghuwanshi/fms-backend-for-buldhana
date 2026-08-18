const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const VendorLog = require("../model/vendorLog");
const Vendor = require("../model/vendor");
const Driver = require("../model/driverModel");
const VehicleMaster = require("../model/maintenanceDevice.model");
const Builty = require("../model/builtyModel");
const Trip = require("../model/tripModel");
const Location = require("../model/location");
const UPLOAD_BASE_URL = "/uploads/vendorlogs";
const { logAction } = require('../utils/logger');
const { notifySupervisorVendorExpense, notifySupervisorVendorTaskUpdate, notifyDriverFuelPumpLog } = require('../services/notificationService');
const determineSupervisorId = (user, body) => {
  if (!user) return null;
  const { role, id, supervisor, supervisorId: userSupervisorId } = user;

  if (role === "superadmin" && body.supervisorId) return body.supervisorId;
  if (role === "worker") return supervisor;
  if (role === "vendor") return userSupervisorId;

  return id;
};


const validateForeignKeys = async (driverId, vehicleId, session) => {
  if (!vehicleId) throw new Error("Vehicle id is required...");

  if (driverId) {
    const driverExists = await Driver.findById(driverId).session(session);
    if (!driverExists) throw new Error("The provided driverId does not exist.");
  }

  if (vehicleId) {
    const vehicleExists = await VehicleMaster.findById(vehicleId).session(session);
    if (!vehicleExists) throw new Error("The provided vehicleId does not exist.");
  }
};

const processFilePaths = (files, logData) => {
  if (!files) return;

  if (files.billImgPath) {
    const [firstBillFile] = files.billImgPath;
    if (firstBillFile && firstBillFile.filename) {
      logData.billImgPath = `${UPLOAD_BASE_URL}/${firstBillFile.filename}`;
    }
  }

  if (files.vehicleImgPath) {
    const [firstVehicleFile] = files.vehicleImgPath;
    if (firstVehicleFile && firstVehicleFile.filename) {
      logData.vehicleImgPath = `${UPLOAD_BASE_URL}/${firstVehicleFile.filename}`;
    }
  }

  if (files.odometerImgPath) {
    const [firstOdometerFile] = files.odometerImgPath;
    if (firstOdometerFile && firstOdometerFile.filename) {
      logData.odometerImgPath = `${UPLOAD_BASE_URL}/${firstOdometerFile.filename}`;
    }
  }

  if (files.profileImgPaths) {
    logData.profileImgPaths = files.profileImgPaths.map(
      (file) => `${UPLOAD_BASE_URL}/${file.filename}`
    );
  }
};

const getReplacedFilePaths = (updateData, existingLog) => {
  const oldFilesToDelete = [];
  const queueForDeletion = (oldPath) => {
    if (oldPath) oldFilesToDelete.push(path.join(__dirname, "..", oldPath));
  };

  if (updateData.billImgPath) queueForDeletion(existingLog.billImgPath);
  if (updateData.vehicleImgPath) queueForDeletion(existingLog.vehicleImgPath);
  if (updateData.odometerImgPath) queueForDeletion(existingLog.odometerImgPath);

  if (updateData.profileImgPaths && updateData.profileImgPaths.length > 0) {
    existingLog.profileImgPaths?.forEach(queueForDeletion);
  }

  return oldFilesToDelete;
};

const rollbackUploadedFiles = (files) => {
  if (!files) return;
  const filesToDelete = [];

  if (files.billImgPath) files.billImgPath.forEach(file => filesToDelete.push(file.path));
  if (files.vehicleImgPath) files.vehicleImgPath.forEach(file => filesToDelete.push(file.path));
  if (files.odometerImgPath) files.odometerImgPath.forEach(file => filesToDelete.push(file.path));
  if (files.profileImgPaths) files.profileImgPaths.forEach(file => filesToDelete.push(file.path));

  filesToDelete.forEach((filePath) => {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });
};

const deleteFilesSilently = (filePaths) => {
  if (!filePaths || filePaths.length === 0) return;
  filePaths.forEach((filePath) => {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });
};

const handleApiError = (error, res) => {
  if (error.message.includes("does not exist") || error.message.includes("is required")) {
    return res.status(404).json({ success: false, message: error.message });
  }
  if (error.name === "ValidationError") {
    return res.status(400).json({ success: false, message: error.message });
  }
  if (error.name === "CastError" && error.kind === "ObjectId") {
    return res.status(400).json({ success: false, message: "Invalid ID format provided." });
  }

  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
    error: error.message,
  });
};

exports.createLog = async (req, res) => {
  try {
    const finalSupervisorId = determineSupervisorId(req.user, req.body);

    if (!req.body.vendorId) req.body.vendorId = req.user.id;
    if (req.body.driverId === "null" || req.body.driverId === "undefined" || req.body.driverId === "") req.body.driverId = null;
    if (req.body.vehicleId === "null" || req.body.vehicleId === "undefined" || req.body.vehicleId === "") req.body.vehicleId = null;

    await validateForeignKeys(req.body.driverId, req.body.vehicleId, null);

    const logData = { ...req.body, supervisorId: finalSupervisorId };
    processFilePaths(req.files, logData);

    const vendorLatVal = req.body.vendorLat !== undefined ? req.body.vendorLat : req.body.lat;
    const vendorLongVal = req.body.vendorLong !== undefined ? req.body.vendorLong : (req.body.vendorLng !== undefined ? req.body.vendorLng : (req.body.long !== undefined ? req.body.long : req.body.lng));
    const vendorAddressVal = req.body.vendorAddress !== undefined ? req.body.vendorAddress : req.body.address;

    if (vendorLatVal !== undefined && vendorLatVal !== null && vendorLatVal !== "") {
      const parsedLat = Number(vendorLatVal);
      if (!isNaN(parsedLat)) logData.vendorLat = parsedLat;
    }

    if (vendorLongVal !== undefined && vendorLongVal !== null && vendorLongVal !== "") {
      const parsedLong = Number(vendorLongVal);
      if (!isNaN(parsedLong)) logData.vendorLong = parsedLong;
    }

    if (vendorAddressVal !== undefined && vendorAddressVal !== null) {
      logData.vendorAddress = String(vendorAddressVal).trim();
    }

    const log = await VendorLog.create(logData);
    try {
      await logAction({
        userId: req.user?._id || req.user?.id || '60d5ec49f1b2c4001f8e4b8e',
        userType: req.user?.role || 'Vendor',
        action: 'CREATE',
        module: 'VendorLog',
        recordId: log._id,
        oldData: null,
        newData: log && typeof log.toObject === 'function' ? log.toObject() : log,
        ipAddress: req.ip,
        userAgent: req.headers ? req.headers['user-agent'] : null,
        apiEndpoint: req.originalUrl,
        requestMethod: req.method,
        status: 'SUCCESS'
      });
    } catch (logError) {
      console.error("Audit log failed for createLog:", logError);
    }

    if (finalSupervisorId && (req.user?.role === 'vendor' || log.createdBy === 'vendor')) {
      notifySupervisorVendorExpense(finalSupervisorId, null, log.vendorId, log).catch((err) => {
        console.error("Async vendor log creation notification error:", err);
      });
    }

    if (log.vendorType === "Fuel Pump" && log.driverId) {
      notifyDriverFuelPumpLog(log.driverId, log).catch((err) => {
        console.error("Async driver fuel pump log notification error:", err);
      });
    }

    return res.status(201).json({
      success: true,
      message: "Log created successfully",
      data: log,
    });

  } catch (error) {
    try {
      await logAction({
        userId: req.user?._id || 'SYSTEM',
        userType: req.user?.role || 'System',
        action: 'CREATE',
        module: 'VendorLog',
        recordId: null,
        status: 'FAILED',
        ipAddress: req.ip,
        userAgent: req.headers ? req.headers['user-agent'] : null,
        apiEndpoint: req.originalUrl,
        requestMethod: req.method,
        error: error.message
      });
    } catch (logErr) { }

    rollbackUploadedFiles(req.files);
    return handleApiError(error, res);
  }
};


exports.patchVendorLog = async (req, res) => {
  try {
    const logId = req.params.id;
    const { builtyId, description, amount, vendorAction } = req.body;

    if (!builtyId) {
      rollbackUploadedFiles(req.files);
      return res.status(400).json({ success: false, message: "builtyId is required." });
    }

    const existingLog = await VendorLog.findById(logId);
    if (!existingLog) {
      rollbackUploadedFiles(req.files);
      return res.status(404).json({ success: false, message: "Log not found." });
    }

    const isBuiltyMatch = existingLog.builtyId?.toString() === builtyId;
    const isVendorMatch = existingLog.vendorId?.toString() === req.user.id.toString();

    if (!isBuiltyMatch) {
      rollbackUploadedFiles(req.files);
      return res.status(400).json({ success: false, message: "Builty ID mismatch." });
    }

    if (!isVendorMatch) {
      rollbackUploadedFiles(req.files);
      return res.status(403).json({ success: false, message: "Unauthorized vendor." });
    }

    if (existingLog.status === "Approved") {
      rollbackUploadedFiles(req.files);
      return res.status(400).json({ success: false, message: "Approved logs cannot be updated." });
    }

    const updateData = {};
    if (description !== undefined) updateData.description = description;
    if (amount !== undefined && amount !== "") updateData.amount = Number(amount);
    if (vendorAction !== undefined) {
      if (!["Completed", "Pending"].includes(vendorAction)) {
        rollbackUploadedFiles(req.files);
        return res.status(400).json({ success: false, message: "Invalid vendorAction value." });
      }
      updateData.vendorAction = vendorAction;
    } else {
      updateData.vendorAction = "Completed";
    }

    let oldFilesToDelete = [];
    if (req.files && Object.keys(req.files).length > 0) {
      processFilePaths(req.files, updateData);
      oldFilesToDelete = getReplacedFilePaths(updateData, existingLog);
    }
    const oldDataSnapshot = existingLog.toObject();
    Object.assign(existingLog, updateData);
    const updatedLog = await existingLog.save();

    deleteFilesSilently(oldFilesToDelete);
    try {
      await logAction({
        userId: req.user?._id || req.user?.id,
        userType: req.user?.role || 'Vendor',
        action: 'UPDATE',
        module: 'VendorLog',
        recordId: logId,
        oldData: oldDataSnapshot,
        newData: updatedLog && typeof updatedLog.toObject === 'function' ? updatedLog.toObject() : updatedLog,
        ipAddress: req.ip,
        userAgent: req.headers ? req.headers['user-agent'] : null,
        apiEndpoint: req.originalUrl,
        requestMethod: req.method,
        status: 'SUCCESS'
      });
    } catch (logError) {
      console.error("Audit log failed for patchVendorLog:", logError);
    }

    if (updatedLog.supervisorId) {
      notifySupervisorVendorTaskUpdate(updatedLog.supervisorId, null, updatedLog.vendorId, updatedLog).catch((err) => {
        console.error("Async vendor task update notification error:", err);
      });
    }

    return res.status(200).json({
      success: true,
      message: "Log updated successfully.",
      data: updatedLog,
    });

  } catch (error) {
    try {
      await logAction({
        userId: req.user?._id || req.user?.id,
        userType: req.user?.role || 'System',
        action: 'UPDATE',
        module: 'VendorLog',
        recordId: req.params.id,
        status: 'FAILED',
        ipAddress: req.ip,
        userAgent: req.headers ? req.headers['user-agent'] : null,
        apiEndpoint: req.originalUrl,
        requestMethod: req.method,
        error: error.message
      });
    } catch (logErr) { }

    rollbackUploadedFiles(req.files);
    return handleApiError(error, res);
  }
};


exports.getAllLogs = async (req, res) => {
  try {
    if (!["user", "vendor"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You do not have permission to view these logs.",
      });
    }

    const { page = 1, limit = 20, createdBy } = req.query;
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skipIndex = (pageNumber - 1) * limitNumber;

    const query = await buildGetAllQuery(req.query, req.user);

    if (createdBy && ["supervisor", "vendor"].includes(createdBy)) {
      query.createdBy = createdBy;
    }

    const [logs, total] = await Promise.all([
      VendorLog.find(query)
        .populate("driverId", "name")
        .populate("vehicleId", "vehicleNumber make")
        .populate("vendorId", "vendorName")
        .sort({ createdAt: -1 })
        .skip(skipIndex)
        .limit(limitNumber)
        .lean(),
      VendorLog.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: "Logs fetched successfully",
      total,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(total / limitNumber),
      count: logs.length,
      builtys: logs,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching the logs.",
      error: error.message,
    });
  }
};

exports.getLogsByVendorId = async (req, res) => {
  try {
    if (!["user", "vendor"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You do not have permission to view these logs.",
      });
    }

    const { vendorId } = req.params;
    const { page = 1, limit = 20, createdBy } = req.query;


    if (req.user.role === "vendor" && req.user.id.toString() !== vendorId) {
      return res.status(403).json({
        success: false,
        message: "Security Error: You can only view your own logs."
      });
    }

    req.query.vendorId = vendorId;

    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skipIndex = (pageNumber - 1) * limitNumber;

    const query = await buildGetAllQuery(req.query, req.user);

    if (createdBy && ["supervisor", "vendor"].includes(createdBy)) {
      query.createdBy = createdBy;
    }

    const [logs, total] = await Promise.all([
      VendorLog.find(query)
        .populate("driverId", "name")
        .populate("vehicleId", "vehicleNumber make")
        .populate("vendorId", "vendorName")
        .sort({ createdAt: -1 })
        .skip(skipIndex)
        .limit(limitNumber)
        .lean(),
      VendorLog.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: "Vendor specific logs fetched successfully",
      total,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(total / limitNumber),
      count: logs.length,
      builtys: logs,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching the vendor logs.",
      error: error.message,
    });
  }
};

exports.updateLog = async (req, res) => {
  try {
    const logId = req.params.id;
    const existingLog = await VendorLog.findById(logId);

    if (!existingLog) {
      if (req.files) rollbackUploadedFiles(req.files);
      return res.status(404).json({
        success: false,
        message: "Log not found.",
      });
    }
    if (existingLog.status === "Approved") {
      if (req.files) rollbackUploadedFiles(req.files);
      return res.status(400).json({
        success: false,
        message: "This log is already approved and cannot be updated.",
      });
    }

    const userId = req.user.id.toString();
    const isSupervisor = existingLog.supervisorId?.toString() === userId;
    const isVendor = existingLog.vendorId?.toString() === userId;
    const isSuperAdmin = req.user.role === "superadmin";

    if (!isSupervisor && !isVendor && !isSuperAdmin) {
      if (req.files) rollbackUploadedFiles(req.files);
      return res.status(403).json({
        success: false,
        message: "Unauthorized: You do not have permission to update this log.",
      });
    }
    const oldDataSnapshot = existingLog.toObject();

    if (req.body.driverId === "null" || req.body.driverId === "undefined" || req.body.driverId === "") {
      req.body.driverId = null;
    }
    if (req.body.vehicleId === "null" || req.body.vehicleId === "undefined" || req.body.vehicleId === "") {
      req.body.vehicleId = null;
    }

    if (req.body.driverId !== undefined || req.body.vehicleId !== undefined) {
      const driverToValidate = req.body.driverId !== undefined ? req.body.driverId : existingLog.driverId;
      const vehicleToValidate = req.body.vehicleId !== undefined ? req.body.vehicleId : existingLog.vehicleId;

      await validateForeignKeys(driverToValidate, vehicleToValidate, null);
    }

    const updateData = { ...req.body };
    let oldFilesToDelete = [];

    if (req.files && Object.keys(req.files).length > 0) {
      processFilePaths(req.files, updateData);

      oldFilesToDelete = getReplacedFilePaths(updateData, existingLog);
    }

    Object.assign(existingLog, updateData);
    const updatedLog = await existingLog.save();
    deleteFilesSilently(oldFilesToDelete);

    try {
      await logAction({
        userId: req.user?._id || req.user?.id,
        userType: req.user?.role || 'User',
        action: 'UPDATE',
        module: 'VendorLog',
        recordId: logId,
        oldData: oldDataSnapshot,
        newData: updatedLog && typeof updatedLog.toObject === 'function' ? updatedLog.toObject() : updatedLog,
        ipAddress: req.ip,
        userAgent: req.headers ? req.headers['user-agent'] : null,
        apiEndpoint: req.originalUrl,
        requestMethod: req.method,
        status: 'SUCCESS'
      });
    } catch (logError) {
      console.error("Audit log failed for updateLog:", logError);
    }

    if (req.user?.role === 'vendor' && updatedLog.supervisorId) {
      notifySupervisorVendorTaskUpdate(updatedLog.supervisorId, null, updatedLog.vendorId, updatedLog).catch((err) => {
        console.error("Async vendor task update notification error:", err);
      });
    }

    return res.status(200).json({
      success: true,
      message: "Log updated successfully.",
      data: updatedLog,
    });

  } catch (error) {
    try {
      await logAction({
        userId: req.user?._id || req.user?.id,
        userType: req.user?.role || 'System',
        action: 'UPDATE',
        module: 'VendorLog',
        recordId: logId,
        status: 'FAILED',
        ipAddress: req.ip,
        userAgent: req.headers ? req.headers['user-agent'] : null,
        apiEndpoint: req.originalUrl,
        requestMethod: req.method,
        error: error.message
      });
    } catch (logErr) { }

    if (req.files) rollbackUploadedFiles(req.files);
    return handleApiError(error, res);
  }
};

exports.deleteLog = async (req, res) => {
  try {
    const log = await VendorLog.findOneAndDelete({ _id: req.params.id, supervisorId: req.user.id });
    if (!log) return res.status(404).json({ message: "Log not found" });

    try {
      await logAction({
        userId: req.user?._id || req.user?.id,
        userType: req.user?.role || 'User',
        action: 'DELETE',
        module: 'VendorLog',
        recordId: req.params.id,
        oldData: log && typeof log.toObject === 'function' ? log.toObject() : log,
        newData: null,
        ipAddress: req.ip,
        userAgent: req.headers ? req.headers['user-agent'] : null,
        apiEndpoint: req.originalUrl,
        requestMethod: req.method,
        status: 'SUCCESS'
      });
    } catch (logError) {
      console.error("Audit log failed for deleteLog:", logError);
    }

    return res.status(200).json({ success: true, message: "Log deleted" });
  } catch (error) {
    try {
      await logAction({
        userId: req.user?._id || req.user?.id,
        userType: req.user?.role || 'System',
        action: 'DELETE',
        module: 'VendorLog',
        recordId: req.params?.id || null,
        status: 'FAILED',
        ipAddress: req.ip,
        userAgent: req.headers ? req.headers['user-agent'] : null,
        apiEndpoint: req.originalUrl,
        requestMethod: req.method,
        error: error.message
      });
    } catch (logErr) { }

    return res.status(500).json({ success: false, message: "Error deleting log" });
  }
};

exports.updateLogStatus = async (req, res) => {
  try {
    const logId = req.params.id;
    const { status } = req.body;

    if (!req.user || req.user.role !== "user") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only supervisors (role: user) can change the log status.",
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required to perform this update.",
      });
    }

    const log = await VendorLog.findById(logId);

    if (!log) {
      return res.status(404).json({
        success: false,
        message: "Log not found.",
      });
    }
    if (log.status === "Approved") {
      return res.status(400).json({
        success: false,
        message: "This log is already approved and cannot be updated.",
      });
    }

    if (log.supervisorId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Your user ID does not match the supervisor ID of this log.",
      });
    }
    const oldDataSnapshot = log.toObject();
    log.status = status;
    await log.save();

    try {
      await logAction({
        userId: req.user?._id || req.user?.id,
        userType: req.user?.role || 'User',
        action: 'UPDATE_STATUS',
        module: 'VendorLog',
        recordId: logId,
        oldData: oldDataSnapshot,
        newData: log && typeof log.toObject === 'function' ? log.toObject() : log,
        ipAddress: req.ip,
        userAgent: req.headers ? req.headers['user-agent'] : null,
        apiEndpoint: req.originalUrl,
        requestMethod: req.method,
        status: 'SUCCESS'
      });
    } catch (logError) {
      console.error("Audit log failed for updateLogStatus:", logError);
    }

    return res.status(200).json({
      success: true,
      message: "Log status updated successfully.",
      data: log,
    });

  } catch (error) {
    try {
      await logAction({
        userId: req.user?._id || req.user?.id,
        userType: req.user?.role || 'System',
        action: 'UPDATE_STATUS',
        module: 'VendorLog',
        recordId: logId,
        status: 'FAILED',
        ipAddress: req.ip,
        userAgent: req.headers ? req.headers['user-agent'] : null,
        apiEndpoint: req.originalUrl,
        requestMethod: req.method,
        error: error.message
      });
    } catch (logErr) { }

    return handleApiError(error, res);
  }
};

const buildGetAllQuery = async (queryParams, user) => {
  const {
    status,
    search,
    fromDate,
    toDate,
    vendorId,
    createdBy = "vendor",
    vendorAction
  } = queryParams;

  let query = {};

  if (user.role === "user") {
    query.supervisorId = user.id;
    if (vendorId) query.vendorId = vendorId;
  } else if (user.role === "vendor") {
    query.vendorId = user.id;
  }

  if (status && ["Pending", "Rejected", "Approved"].includes(status)) {
    query.status = status;
  }

  if (vendorAction && ["Completed", "Pending"].includes(vendorAction)) {
    query.vendorAction = vendorAction;
  }

  if (createdBy && ["supervisor", "vendor"].includes(createdBy)) {
    query.createdBy = createdBy;
  }

  const cleanSearch = search?.trim();

  if (cleanSearch) {
    const searchRegex = { $regex: cleanSearch, $options: "i" };

    const [drivers, vehicles, vendors, builtys] = await Promise.all([
      Driver.find({ name: searchRegex }, '_id').lean(),
      VehicleMaster.find({ $or: [{ vehicleNumber: searchRegex }, { make: searchRegex }] }, '_id').lean(),
      Vendor.find({ vendorName: searchRegex }, '_id').lean(),
      Builty.find({ tpNo: searchRegex }, '_id').lean()
    ]);

    const orConditions = [];

    // OPTIMIZATION 3: Only map arrays and push to conditions if they actually contain data.
    if (drivers.length) orConditions.push({ driverId: { $in: drivers.map(d => d._id) } });
    if (vehicles.length) orConditions.push({ vehicleId: { $in: vehicles.map(v => v._id) } });
    if (vendors.length) orConditions.push({ vendorId: { $in: vendors.map(v => v._id) } });
    if (builtys.length) orConditions.push({ builtyId: { $in: builtys.map(b => b._id) } });

    if (orConditions.length > 0) {
      query.$or = orConditions;
    } else {
      query._id = { $in: [] };
    }
  }

  if (fromDate || toDate) {
    query.createdAt = {};

    if (fromDate) {
      const parsedFrom = new Date(fromDate);
      if (!isNaN(parsedFrom.getTime())) {
        query.createdAt.$gte = parsedFrom;
      }
    }

    if (toDate) {
      const endDate = new Date(toDate);
      if (!isNaN(endDate.getTime())) {
        endDate.setUTCHours(23, 59, 59, 999);
        query.createdAt.$lte = endDate;
      }
    }
    if (Object.keys(query.createdAt).length === 0) {
      delete query.createdAt;
    }
  }

  return query;
};
exports.getSupervisorCreatedLogs = async (req, res) => {
  try {

    if (!["user", "vendor"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You do not have permission to view these logs.",
      });
    }

    const { page = 1, limit = 20 } = req.query;
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skipIndex = (pageNumber - 1) * limitNumber;

    const query = await buildGetAllQuery(req.query, req.user);
    query.createdBy = "supervisor";

    const [logs, total] = await Promise.all([
      VendorLog.find(query)
        .populate("driverId", "name")
        .populate("vehicleId", "vehicleNumber make")
        .populate("vendorId", "vendorName")
        .populate({
          path: "builtyId",
          select: "tpNo description pickupLocationId destinationLocationId",
          populate: [
            {
              path: "pickupLocationId",
              select: "locationName"
            },
            {
              path: "destinationLocationId",
              select: "locationName"
            }
          ]
        })
        .sort({ createdAt: -1 })
        .skip(skipIndex)
        .limit(limitNumber)
        .lean(),
      VendorLog.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: "Supervisor logs fetched successfully",
      total,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(total / limitNumber),
      count: logs.length,
      builtys: logs,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching supervisor logs.",
      error: error.message,
    });
  }
};

exports.getLogsByVendorIdCreatedBySup = async (req, res) => {
  try {
    if (!["user", "vendor"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You do not have permission to view these logs.",
      });
    }

    const { vendorId } = req.params;
    const { page = 1, limit = 20, createdBy } = req.query;

    if (req.user.role === "vendor" && req.user.id.toString() !== vendorId) {
      return res.status(403).json({
        success: false,
        message: "Security Error: You can only view your own logs."
      });
    }

    req.query.vendorId = vendorId;

    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skipIndex = (pageNumber - 1) * limitNumber;

    const query = await buildGetAllQuery(req.query, req.user);
    query.createdBy = "supervisor";
    const [logs, total] = await Promise.all([
      VendorLog.find(query)
        .populate("driverId", "name")
        .populate("vehicleId", "vehicleNumber make")
        .populate("vendorId", "vendorName")
        .populate({
          path: "builtyId",
          select: "tpNo description pickupLocationId destinationLocationId",
          populate: [
            {
              path: "pickupLocationId",
              select: "locationName"
            },
            {
              path: "destinationLocationId",
              select: "locationName"
            }
          ]
        })
        .sort({ createdAt: -1 })
        .skip(skipIndex)
        .limit(limitNumber)
        .lean(),
      VendorLog.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: "Vendor specific logs fetched successfully",
      total,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(total / limitNumber),
      count: logs.length,
      builtys: logs,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching the vendor logs.",
      error: error.message,
    });
  }
};

exports.getLogsByDriverId = async (req, res) => {
  try {
    const driverId = req.params.driverId || req.query.driverId || (req.user?.role === "driver" ? req.user.id : null);

    if (!driverId) {
      return res.status(400).json({
        success: false,
        message: "Driver ID is required."
      });
    }

    const { page = 1, limit = 20, search } = req.query;
    const pageNumber = Math.max(1, Number(page) || 1);
    const limitNumber = Math.max(1, Number(limit) || 20);
    const skipIndex = (pageNumber - 1) * limitNumber;

    let query = { driverId };

    const cleanSearch = search?.trim();
    if (cleanSearch) {
      const searchRegex = { $regex: cleanSearch, $options: "i" };

      const [vehicles, vendors, builtys, trips] = await Promise.all([
        VehicleMaster.find({ $or: [{ vehicleNumber: searchRegex }, { make: searchRegex }] }, '_id').lean(),
        Vendor.find({ vendorName: searchRegex }, '_id').lean(),
        Builty.find({ $or: [{ tpNo: searchRegex }, { docNo: searchRegex }] }, '_id').lean(),
        Trip.find({ tripId: searchRegex }, '_id').lean()
      ]);

      const orConditions = [
        { description: searchRegex },
        { vendorType: searchRegex },
        { status: searchRegex }
      ];

      if (vehicles.length) orConditions.push({ vehicleId: { $in: vehicles.map(v => v._id) } });
      if (vendors.length) orConditions.push({ vendorId: { $in: vendors.map(v => v._id) } });
      if (builtys.length) orConditions.push({ builtyId: { $in: builtys.map(b => b._id) } });
      if (trips.length) orConditions.push({ tripId: { $in: trips.map(t => t._id) } });

      query.$and = [
        { driverId },
        { $or: orConditions }
      ];
    }

    const [logs, total] = await Promise.all([
      VendorLog.find(query)
        .populate("driverId", "name contactNumber profileImage")
        .populate("vehicleId", "vehicleNumber make categoryId grossVehicleWeight")
        .populate("vendorId", "vendorName contactNumber email")
        .populate({
          path: "builtyId",
          select: "tpNo docNo description pickupLocation destinationLocation status"
        })
        .populate({
          path: "tripId",
          select: "tripId vehicleName startLocation endLocation status"
        })
        .sort({ createdAt: -1 })
        .skip(skipIndex)
        .limit(limitNumber)
        .lean(),
      VendorLog.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: "Driver vendor logs fetched successfully",
      total,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(total / limitNumber),
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    console.error("Error fetching driver vendor logs:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching driver logs.",
      error: error.message,
    });
  }
};

exports.patchDriverOdometer = async (req, res) => {
  try {
    const logId = req.params.id;
    const { odometer } = req.body;

    if (odometer === undefined || odometer === null || odometer === "") {
      rollbackUploadedFiles(req.files);
      return res.status(400).json({
        success: false,
        message: "Odometer reading is required."
      });
    }

    const numericOdometer = Number(odometer);
    if (isNaN(numericOdometer) || numericOdometer < 0) {
      rollbackUploadedFiles(req.files);
      return res.status(400).json({
        success: false,
        message: "Invalid odometer reading provided."
      });
    }

    const log = await VendorLog.findById(logId);
    if (!log) {
      rollbackUploadedFiles(req.files);
      return res.status(404).json({
        success: false,
        message: "Vendor log not found."
      });
    }

    const driverIdStr = req.user?._id?.toString() || req.user?.id?.toString();

    // Verification: Driver can only update entries related to them
    const isAssignedDriver = log.driverId?.toString() === driverIdStr;
    const isAuthorizedRole = ["user", "superadmin"].includes(req.user?.role);

    if (req.user?.role === "driver" && !isAssignedDriver) {
      rollbackUploadedFiles(req.files);
      return res.status(403).json({
        success: false,
        message: "Unauthorized: You can only update the odometer reading for logs assigned to you."
      });
    }

    if (!isAssignedDriver && !isAuthorizedRole) {
      rollbackUploadedFiles(req.files);
      return res.status(403).json({
        success: false,
        message: "Access denied. You do not have permission to update this log."
      });
    }

    let odometerImgPath = undefined;
    if (req.file) {
      odometerImgPath = `${UPLOAD_BASE_URL}/${req.file.filename}`;
    } else if (req.files && req.files.odometerImgPath) {
      const [fileObj] = req.files.odometerImgPath;
      if (fileObj && fileObj.filename) {
        odometerImgPath = `${UPLOAD_BASE_URL}/${fileObj.filename}`;
      }
    }

    if (!odometerImgPath && req.body.odometerImgPath) {
      odometerImgPath = req.body.odometerImgPath;
    }

    const oldDataSnapshot = log.toObject();
    let oldFilesToDelete = [];

    log.odometer = numericOdometer;
    if (odometerImgPath !== undefined && odometerImgPath !== null) {
      if (log.odometerImgPath && odometerImgPath !== log.odometerImgPath && log.odometerImgPath.startsWith(UPLOAD_BASE_URL)) {
        oldFilesToDelete.push(path.join(__dirname, "..", log.odometerImgPath));
      }
      log.odometerImgPath = odometerImgPath;
    }

    const driverLatVal = req.body.driverLat !== undefined ? req.body.driverLat : req.body.lat;
    const driverLongVal = req.body.driverLong !== undefined ? req.body.driverLong : (req.body.driverLng !== undefined ? req.body.driverLng : (req.body.long !== undefined ? req.body.long : req.body.lng));
    const driverAddressVal = req.body.driverAddress !== undefined ? req.body.driverAddress : req.body.address;

    if (driverLatVal !== undefined && driverLatVal !== null && driverLatVal !== "") {
      const parsedLat = Number(driverLatVal);
      if (!isNaN(parsedLat)) log.driverLat = parsedLat;
    }

    if (driverLongVal !== undefined && driverLongVal !== null && driverLongVal !== "") {
      const parsedLong = Number(driverLongVal);
      if (!isNaN(parsedLong)) log.driverLong = parsedLong;
    }

    if (driverAddressVal !== undefined && driverAddressVal !== null) {
      log.driverAddress = String(driverAddressVal).trim();
    }

    const updatedLog = await log.save();
    deleteFilesSilently(oldFilesToDelete);

    try {
      await logAction({
        userId: driverIdStr,
        userType: req.user?.role || 'Driver',
        action: 'UPDATE_ODOMETER',
        module: 'VendorLog',
        recordId: logId,
        oldData: oldDataSnapshot,
        newData: updatedLog && typeof updatedLog.toObject === 'function' ? updatedLog.toObject() : updatedLog,
        ipAddress: req.ip,
        userAgent: req.headers ? req.headers['user-agent'] : null,
        apiEndpoint: req.originalUrl,
        requestMethod: req.method,
        status: 'SUCCESS'
      });
    } catch (logError) {
      console.error("Audit log failed for patchDriverOdometer:", logError);
    }

    return res.status(200).json({
      success: true,
      message: "Odometer reading updated successfully.",
      data: updatedLog
    });
  } catch (error) {
    rollbackUploadedFiles(req.files);
    console.error("Error updating driver odometer:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while updating odometer reading.",
      error: error.message
    });
  }
};

exports.getFuelPumpLogsByTripId = async (req, res) => {
  try {
    const tripId = req.params.tripId || req.query.tripId;

    if (!tripId) {
      return res.status(400).json({
        success: false,
        message: "Trip ID is required."
      });
    }

    const isObjectId = mongoose.Types.ObjectId.isValid(tripId);
    const tripQuery = isObjectId
      ? { $or: [{ _id: tripId }, { tripId }] }
      : { tripId };

    const tripDoc = await Trip.findOne(tripQuery).select("_id").lean();
    const searchTripId = tripDoc ? tripDoc._id : (isObjectId ? tripId : null);

    const { page = 1, limit = 20, search } = req.query;
    const pageNumber = Math.max(1, Number(page) || 1);
    const limitNumber = Math.max(1, Number(limit) || 20);
    const skipIndex = (pageNumber - 1) * limitNumber;

    if (!searchTripId) {
      return res.status(200).json({
        success: true,
        message: "Fuel pump vendor logs fetched successfully",
        total: 0,
        page: pageNumber,
        limit: limitNumber,
        totalPages: 0,
        count: 0,
        totalFuel: 0,
        totalAmount: 0,
        data: []
      });
    }

    const query = {
      tripId: searchTripId,
      vendorType: "Fuel Pump"
    };

    const cleanSearch = search?.trim();
    if (cleanSearch) {
      const searchRegex = { $regex: cleanSearch, $options: "i" };

      const [vehicles, vendors, builtys, drivers] = await Promise.all([
        VehicleMaster.find({ $or: [{ vehicleNumber: searchRegex }, { make: searchRegex }] }, '_id').lean(),
        Vendor.find({ vendorName: searchRegex }, '_id').lean(),
        Builty.find({ $or: [{ tpNo: searchRegex }, { docNo: searchRegex }] }, '_id').lean(),
        Driver.find({ name: searchRegex }, '_id').lean()
      ]);

      const orConditions = [
        { description: searchRegex },
        { status: searchRegex }
      ];

      if (vehicles.length) orConditions.push({ vehicleId: { $in: vehicles.map(v => v._id) } });
      if (vendors.length) orConditions.push({ vendorId: { $in: vendors.map(v => v._id) } });
      if (builtys.length) orConditions.push({ builtyId: { $in: builtys.map(b => b._id) } });
      if (drivers.length) orConditions.push({ driverId: { $in: drivers.map(d => d._id) } });

      query.$or = orConditions;
    }

    const [logs, stats] = await Promise.all([
      VendorLog.find(query)
        .populate("driverId", "name contactNumber profileImage")
        .populate("vehicleId", "vehicleNumber make categoryId grossVehicleWeight")
        .populate("vendorId", "vendorName contactNumber email")
        .populate({
          path: "builtyId",
          select: "tpNo docNo description pickupLocation destinationLocation status"
        })
        .populate({
          path: "tripId",
          select: "tripId vehicleName startLocation endLocation status"
        })
        .sort({ createdAt: -1 })
        .skip(skipIndex)
        .limit(limitNumber)
        .lean(),
      VendorLog.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            totalFuel: { $sum: "$fuel" },
            totalAmount: { $sum: "$amount" }
          }
        }
      ])
    ]);

    const total = stats.length > 0 ? stats[0].total || 0 : 0;
    const totalFuel = stats.length > 0 ? stats[0].totalFuel || 0 : 0;
    const totalAmount = stats.length > 0 ? stats[0].totalAmount || 0 : 0;

    return res.status(200).json({
      success: true,
      message: "Fuel pump vendor logs fetched successfully",
      total,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(total / limitNumber),
      count: logs.length,
      totalFuel,
      totalAmount,
      data: logs,
    });
  } catch (error) {
    console.error("Error fetching fuel pump vendor logs by trip ID:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching fuel pump logs.",
      error: error.message,
    });
  }
};
