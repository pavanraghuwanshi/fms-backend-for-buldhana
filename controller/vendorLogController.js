const VendorLog = require("../models/VendorLog");
const path = require("path");
const fs = require("fs");

exports.createLog = async (req, res) => {
  try {
    // 1. Authorization & Scoping
    const { role, id, supervisor, supervisorId: userSupervisorId } = req.user;
    let finalSupervisorId;

    if (role === "superadmin" && req.body.supervisorId) {
      finalSupervisorId = req.body.supervisorId;
    } else if (role === "worker") {
      finalSupervisorId = supervisor;
    } else if (role === "vendor") {
      finalSupervisorId = userSupervisorId;
    } else {
      finalSupervisorId = id; // Default to the logged-in user
    }

    // 2. File Path Handling
    const logData = { ...req.body, supervisorId: finalSupervisorId };

    if (req.body.builtyId) {
      const existingLog = await VendorLog.findOne({ 
        supervisorId: finalSupervisorId, 
        builtyId: req.body.builtyId 
      });

      if (existingLog) {
        return res.status(409).json({ 
          success: false, 
          message: "A log entry for this Builty already exists for this supervisor." 
        });
      }
    }
    
    // Process files if they exist in req.files
    if (req.files) {
      if (req.files.billImgPath) {
        logData.billImgPath = `/uploads/vendorlogs/${req.files.billImgPath.filename}`;
      }
      if (req.files.vehicleImgPath) {
        logData.vehicleImgPath = `/uploads/vendorlogs/${req.files.vehicleImgPath.filename}`;
      }
      if (req.files.profileImgPaths) {
        logData.profileImgPaths = req.files.profileImgPaths.map(
          file => `/uploads/vendorlogs/${file.filename}`
        );
      }
    }

    // 3. Database Save
    const log = await VendorLog.create(logData);

    res.status(201).json({ 
      success: true, 
      message: "Log created successfully", 
      data: log 
    });

  } catch (error) {
    console.error("Create Log Error:", error);
    
    // 4. Proper Error Handling
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    
    res.status(500).json({ 
      success: false, 
      message: "Internal Server Error", 
      error: error.message 
    });
  }
};


// Get All (With Filtering & Pagination)
exports.getAllLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const query = { supervisorId: req.user.id }; // Security: Scoping

    const [logs, total] = await Promise.all([
      VendorLog.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      VendorLog.countDocuments(query),
    ]);

    res.status(200).json({ success: true, count: logs.length, total, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching logs" });
  }
};

// Update
exports.updateLog = async (req, res) => {
  try {
    const log = await VendorLog.findOneAndUpdate(
      { _id: req.params.id, supervisorId: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!log) return res.status(404).json({ message: "Log not found" });
    res.status(200).json({ success: true, data: log });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
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