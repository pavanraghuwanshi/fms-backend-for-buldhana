const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const VendorLog = require("../model/vendorLog");
const Vendor = require("../model/vendor");
const Driver = require("../model/driverModel");
const VehicleMaster = require("../model/maintenanceDevice.model");
const Builty = require("../model/builtyModel");
const Location = require("../model/location");
const UPLOAD_BASE_URL = "/uploads/vendorlogs";

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

  // 1. Bill Image
  if (files.billImgPath) {
    const [firstBillFile] = files.billImgPath;
    if (firstBillFile && firstBillFile.filename) {
      logData.billImgPath = `${UPLOAD_BASE_URL}/${firstBillFile.filename}`;
    }
  }

  // 2. Vehicle Image
  if (files.vehicleImgPath) {
    const [firstVehicleFile] = files.vehicleImgPath;
    if (firstVehicleFile && firstVehicleFile.filename) {
      logData.vehicleImgPath = `${UPLOAD_BASE_URL}/${firstVehicleFile.filename}`;
    }
  }

  // 3. Profile Images
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

// MAIN CONTROLLERS
exports.createLog = async (req, res) => {
  try {
    const finalSupervisorId = determineSupervisorId(req.user, req.body);

    if (!req.body.vendorId) req.body.vendorId = req.user.id;
    if (req.body.driverId === "null" || req.body.driverId === "undefined" || req.body.driverId === "") req.body.driverId = null;
    if (req.body.vehicleId === "null" || req.body.vehicleId === "undefined" || req.body.vehicleId === "") req.body.vehicleId = null;

    await validateForeignKeys(req.body.driverId, req.body.vehicleId, null);

    const logData = { ...req.body, supervisorId: finalSupervisorId };
    processFilePaths(req.files, logData);

    const log = await VendorLog.create(logData);

    return res.status(201).json({
      success: true,
      message: "Log created successfully",
      data: log,
    });

  } catch (error) {
    rollbackUploadedFiles(req.files);
    return handleApiError(error, res);
  }
};

// --- HELPER: BUILD QUERY FOR GET ALL LOGS ---


exports.patchVendorLog = async (req, res) => {
  try {
    const logId = req.params.id;
    const { builtyId, description, amount } = req.body;

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

    let oldFilesToDelete = [];
    if (req.files && Object.keys(req.files).length > 0) {
      processFilePaths(req.files, updateData);
      oldFilesToDelete = getReplacedFilePaths(updateData, existingLog);
    }

    Object.assign(existingLog, updateData);
    const updatedLog = await existingLog.save();

    deleteFilesSilently(oldFilesToDelete);

    return res.status(200).json({
      success: true,
      message: "Log updated successfully.",
      data: updatedLog,
    });

  } catch (error) {
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
      return res.status(404).json({
        success: false,
        message: "Log not found.",
      });
    }

    if (existingLog.status === "Approved") {
      rollbackUploadedFiles(req.files);
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
      rollbackUploadedFiles(req.files);
      return res.status(403).json({
        success: false,
        message: "Unauthorized: You do not have permission to update this log.",
      });
    }

    if (req.body.driverId === "null" || req.body.driverId === "undefined" || req.body.driverId === "") {
      req.body.driverId = null;
    }
    if (req.body.vehicleId === "null" || req.body.vehicleId === "undefined" || req.body.vehicleId === "") {
      req.body.vehicleId = null;
    }

    if (req.body.driverId !== undefined || req.body.vehicleId !== undefined) {
      await validateForeignKeys(
        req.body.driverId !== undefined ? req.body.driverId : existingLog.driverId,
        req.body.vehicleId !== undefined ? req.body.vehicleId : existingLog.vehicleId,
        null
      );
    }

    const updateData = { ...req.body };
    const oldFilesToDelete = [];

    if (req.files && Object.keys(req.files).length > 0) {
      processFilePaths(req.files, updateData);

      if (req.files.billImgPath && existingLog.billImgPath) {
        oldFilesToDelete.push(path.join(__dirname, "..", existingLog.billImgPath));
      }
      if (req.files.vehicleImgPath && existingLog.vehicleImgPath) {
        oldFilesToDelete.push(path.join(__dirname, "..", existingLog.vehicleImgPath));
      }
      if (req.files.profileImgPaths && existingLog.profileImgPaths?.length > 0) {
        existingLog.profileImgPaths.forEach(oldPath => {
          oldFilesToDelete.push(path.join(__dirname, "..", oldPath));
        });
      }
    }

    Object.assign(existingLog, updateData);
    const updatedLog = await existingLog.save();
    oldFilesToDelete.forEach((filePath) => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    return res.status(200).json({
      success: true,
      message: "Log updated successfully.",
      data: updatedLog,
    });

  } catch (error) {
    rollbackUploadedFiles(req.files);
    return handleApiError(error, res);
  }
};

// Delete
exports.deleteLog = async (req, res) => {
  try {
    const log = await VendorLog.findOneAndDelete({ _id: req.params.id, supervisorId: req.user.id });
    if (!log) return res.status(404).json({ message: "Log not found" });
    res.status(200).json({ success: true, message: "Log deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting log" });
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

    log.status = status;
    await log.save();

    return res.status(200).json({
      success: true,
      message: "Log status updated successfully.",
      data: log,
    });

  } catch (error) {
    return handleApiError(error, res);
  }
};

// 1. Added 'async' here
const buildGetAllQuery = async (queryParams, user) => {
  const { status, search, fromDate, toDate, vendorId, createdBy = "vendor" } = queryParams;
  let query = {};

  if (user.role === "user") {
    query.supervisorId = user.id;
    if (vendorId) query.vendorId = vendorId;
  } else if (user.role === "vendor") {
    query.vendorId = user.id;
  }

  if (status) query.status = status;

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
    // 1. Role Check (Now allows both supervisors/'user' and 'vendors')
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

exports.getLogsByVendorId = async (req, res) => {
  try {
    // 1. Basic role check
    if (!["user", "vendor"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You do not have permission to view these logs.",
      });
    }

    const { vendorId } = req.params;
    const { page = 1, limit = 20, createdBy } = req.query;

    // 2. Security Check: Vendors can only view their own logs
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
        // Deep populate to get Builty info AND Location names
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