const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const VendorLog = require("../model/vendorLog");
const Driver = require("../model/driverModel");
const VehicleMaster = require("../model/maintenanceDevice.model");

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

    const { page = 1, limit = 20 } = req.query;
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skipIndex = (pageNumber - 1) * limitNumber;
    const query = buildGetAllQuery(req.query, req.user);

    const [logs, total] = await Promise.all([
      VendorLog.find(query)
        .populate("driverId", "name")
        .populate("vehicleId", "vehicleNumber make")
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
    // 1. Basic role check
    if (!["user", "vendor"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You do not have permission to view these logs.",
      });
    }

    const { vendorId } = req.params; 
    const { page = 1, limit = 20 } = req.query;


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
    const query = buildGetAllQuery(req.query, req.user);
    const [logs, total] = await Promise.all([
      VendorLog.find(query)
        .populate("driverId", "name")
        .populate("vehicleId", "vehicleNumber make")
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

    // 1. Fetch the existing log
    const existingLog = await VendorLog.findById(logId);

    if (!existingLog) {
      return res.status(404).json({
        success: false,
        message: "Log not found.",
      });
    }

    // 2. Prevent updates if the log is already Approved
    if (existingLog.status === "Approved") {
      // If new files were uploaded but we are rejecting the update, delete the incoming files
      rollbackUploadedFiles(req.files);
      return res.status(400).json({
        success: false,
        message: "This log is already approved and cannot be updated.",
      });
    }

    // 3. Authorization Check
    // Allow update if user is the superadmin, the supervisor of this log, or the vendor of this log
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

    // 4. Sanitize incoming foreign keys
    if (req.body.driverId === "null" || req.body.driverId === "undefined" || req.body.driverId === "") {
      req.body.driverId = null;
    }
    if (req.body.vehicleId === "null" || req.body.vehicleId === "undefined" || req.body.vehicleId === "") {
      req.body.vehicleId = null;
    }

    // 5. Validate foreign keys (only if they are being updated)
    if (req.body.driverId !== undefined || req.body.vehicleId !== undefined) {
      await validateForeignKeys(
        req.body.driverId !== undefined ? req.body.driverId : existingLog.driverId,
        req.body.vehicleId !== undefined ? req.body.vehicleId : existingLog.vehicleId,
        null
      );
    }

    // 6. Handle File Updates
    const updateData = { ...req.body };
    const oldFilesToDelete = [];

    if (req.files && Object.keys(req.files).length > 0) {
      processFilePaths(req.files, updateData);

      // Queue old files for deletion to save disk space
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

    // 7. Update the document
    Object.assign(existingLog, updateData);
    const updatedLog = await existingLog.save();

    // 8. Delete old replaced files from the file system
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
    // If anything fails, delete the new files that were just uploaded
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



const buildGetAllQuery = (queryParams, user) => {
  const { status, search, fromDate, toDate, vendorId } = queryParams;
  let query = {};

  // 1. Role-Based Scoping & Vendor Filtering
  if (user.role === "user") {
    query.supervisorId = user.id;
    // Supervisors can optionally filter by a specific vendorId
    if (vendorId) query.vendorId = vendorId; 
  } else if (user.role === "vendor") {
    // Vendors are strictly locked to their own ID (ignores any query passed)
    query.vendorId = user.id;
  }

  // 2. Status Filter
  if (status) query.status = status;

  // 3. Search Filter (Description)
  if (search) {
    query.$or = [{ description: { $regex: search, $options: "i" } }];
  }

  // 4. Date Range Filter
  if (fromDate || toDate) {
    query.createdAt = {};
    if (fromDate) query.createdAt.$gte = new Date(fromDate);
    
    if (toDate) {
      // Set the toDate to 23:59:59.999 to cover the entire end day
      const endDate = new Date(toDate);
      endDate.setUTCHours(23, 59, 59, 999);
      query.createdAt.$lte = endDate;
    }
  }

  return query;
};