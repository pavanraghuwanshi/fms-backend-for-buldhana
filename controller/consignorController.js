const Consignor = require("../model/consignorModel");
const { logAction } = require("../utils/logger");


// CREATE
exports.createconsignor = async (req, res) => {
  try {
    const { name, address,pincode,contactNumber,contactPerson,gstNumber,panNumber, supervisorId, supervisorName, workerId } = req.body;

    // PERMISSION
    if (!["user", "worker"].includes(req.user.role)) {
      return res.status(403).json({
        message: "You are not authorized to create consignor",
      });
    }

    if (!name || !address) {
      return res.status(400).json({
        message: "Name and address are required",
      });
    }

    const payload = { name, address, pincode, contactNumber, contactPerson, gstNumber, panNumber };

    // ROLE BASED PAYLOAD
    if (req.user.role === "user") {
      payload.supervisorId = req.user.id;
      payload.supervisorName = req.user.username;
    }

    if (req.user.role === "worker") {
      payload.workerId = req.user.id;
      payload.supervisorId = req.user.supervisor;
      payload.supervisorName = req.user.supervisorName;
    }

    const consignorData = await Consignor.create(payload);

    try {
      await logAction({
        userId: req.user?._id || req.user?.id,
        userType: req.user?.role || 'User',
        action: 'CREATE',
        module: 'Consignor',
        recordId: consignorData._id,
        oldData: null,
        newData: consignorData && typeof consignorData.toObject === 'function' ? consignorData.toObject() : consignorData,
        ipAddress: req.ip,
        userAgent: req.headers ? req.headers['user-agent'] : null,
        apiEndpoint: req.originalUrl,
        requestMethod: req.method,
        status: 'SUCCESS'
      });
    } catch (logError) {
      console.error("Audit log failed for createconsignor:", logError);
    }

    res.status(201).json({
      message: "Consignor created successfully",
      consignor: consignorData,
    });
  } catch (error) {
    try {
      await logAction({
        userId: req.user?._id || req.user?.id,
        userType: req.user?.role || 'System',
        action: 'CREATE',
        module: 'Consignor',
        recordId: null,
        status: 'FAILED',
        ipAddress: req.ip,
        userAgent: req.headers ? req.headers['user-agent'] : null,
        apiEndpoint: req.originalUrl,
        requestMethod: req.method,
        error: error.message
      });
    } catch (logErr) {}

    res.status(500).json({ message: error.message });
  }
};


//  GET ALL
exports.getAllconsignors = async (req, res) => {
  try {
    if (!["user", "worker"].includes(req.user.role)) {
      return res.status(403).json({
        message: "You are not authorized to view consignors",
      });
    }

    let { page = 1, limit = 10, search = "" } = req.query;

    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;

    const filter = { isDeleted: false };

    // ✅ ROLE FILTER
    if (req.user.role === "user") {
      filter.supervisorId = req.user.id;
    }

    if (req.user.role === "worker") {
      filter.supervisorId = req.user.supervisor;
    }

    // ✅ SEARCH FILTER (name, phone, etc. adjust fields as per schema)
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [consignors, total] = await Promise.all([
      Consignor.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      Consignor.countDocuments(filter),
    ]);

    res.status(200).json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      count: consignors.length,
      consignors,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// GET BY ID
exports.getconsignorById = async (req, res) => {
  try {
    if (!["user", "worker"].includes(req.user.role)) {
      return res.status(403).json({
        message: "You are not authorized to view consignor",
      });
    }

    const filter = {
      _id: req.params.id,
      isDeleted: false,
    };

    if (req.user.role === "user") {
      filter.supervisorId = req.user.id;
    }

    if (req.user.role === "worker") {
      filter.supervisorId = req.user.supervisor;
    }

    const consignor = await Consignor.findOne(filter);

    if (!consignor) {
      return res.status(404).json({ message: "Consignor not found" });
    }

    res.status(200).json(consignor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// UPDATE
exports.updateconsignor = async (req, res) => {
  try {
    if (req.user.role !== "user") {
      return res.status(403).json({
        message: "Only supervisor can update consignor",
      });
    }

    const updateData = {};
    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.address !== undefined) updateData.address = req.body.address;
    if (req.body.pincode !== undefined) updateData.pincode = req.body.pincode;
    if (req.body.contactNumber !== undefined) updateData.contactNumber = req.body.contactNumber;
    if (req.body.contactPerson !== undefined) updateData.contactPerson = req.body.contactPerson;
    if (req.body.gstNumber !== undefined) updateData.gstNumber = req.body.gstNumber;
    if (req.body.panNumber !== undefined) updateData.panNumber = req.body.panNumber;
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        message: "No fields provided to update",
      });
    }

    const existingConsignor = await Consignor.findOne({
      _id: req.params.id,
      supervisorId: req.user.id,
      isDeleted: false,
    });
    const oldConsignorSnapshot = existingConsignor && typeof existingConsignor.toObject === 'function' ? existingConsignor.toObject() : existingConsignor;

    const updatedConsignor = await Consignor.findOneAndUpdate(
      {
        _id: req.params.id,
        supervisorId: req.user.id,
        isDeleted: false,
      },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedConsignor) {
      return res.status(404).json({ message: "Consignor not found" });
    }

    try {
      await logAction({
        userId: req.user?._id || req.user?.id,
        userType: req.user?.role || 'User',
        action: 'UPDATE',
        module: 'Consignor',
        recordId: req.params.id,
        oldData: oldConsignorSnapshot,
        newData: updatedConsignor && typeof updatedConsignor.toObject === 'function' ? updatedConsignor.toObject() : updatedConsignor,
        ipAddress: req.ip,
        userAgent: req.headers ? req.headers['user-agent'] : null,
        apiEndpoint: req.originalUrl,
        requestMethod: req.method,
        status: 'SUCCESS'
      });
    } catch (logError) {
      console.error("Audit log failed for updateconsignor:", logError);
    }

    res.status(200).json({
      message: "Consignor updated successfully",
      consignor: updatedConsignor,
    });
  } catch (error) {
    try {
      await logAction({
        userId: req.user?._id || req.user?.id,
        userType: req.user?.role || 'System',
        action: 'UPDATE',
        module: 'Consignor',
        recordId: req.params?.id || null,
        status: 'FAILED',
        ipAddress: req.ip,
        userAgent: req.headers ? req.headers['user-agent'] : null,
        apiEndpoint: req.originalUrl,
        requestMethod: req.method,
        error: error.message
      });
    } catch (logErr) {}

    res.status(500).json({ message: error.message });
  }
};



// SOFT DELETE
exports.softdeleteconsignor = async (req, res) => {
  try {
    if (req.user.role !== "user") {
      return res.status(403).json({
        message: "Only supervisor can delete consignor",
      });
    }

    const existingConsignor = await Consignor.findOne({
      _id: req.params.id,
      supervisorId: req.user.id,
      isDeleted: false,
    });
    const oldConsignorSnapshot = existingConsignor && typeof existingConsignor.toObject === 'function' ? existingConsignor.toObject() : existingConsignor;

    const consignor = await Consignor.findOneAndUpdate(
      {
        _id: req.params.id,
        supervisorId: req.user.id,
        isDeleted: false,
      },
      {
        isDeleted: true,
        deletedAt: new Date(),
      },
      { new: true }
    );

    if (!consignor) {
      return res.status(404).json({ message: "Consignor not found" });
    }

    try {
      await logAction({
        userId: req.user?._id || req.user?.id,
        userType: req.user?.role || 'User',
        action: 'DELETE',
        module: 'Consignor',
        recordId: req.params.id,
        oldData: oldConsignorSnapshot,
        newData: consignor && typeof consignor.toObject === 'function' ? consignor.toObject() : consignor,
        ipAddress: req.ip,
        userAgent: req.headers ? req.headers['user-agent'] : null,
        apiEndpoint: req.originalUrl,
        requestMethod: req.method,
        status: 'SUCCESS'
      });
    } catch (logError) {
      console.error("Audit log failed for softdeleteconsignor:", logError);
    }

    res.status(200).json({
      message: "Consignor deleted successfully",
    });
  } catch (error) {
    try {
      await logAction({
        userId: req.user?._id || req.user?.id,
        userType: req.user?.role || 'System',
        action: 'DELETE',
        module: 'Consignor',
        recordId: req.params?.id || null,
        status: 'FAILED',
        ipAddress: req.ip,
        userAgent: req.headers ? req.headers['user-agent'] : null,
        apiEndpoint: req.originalUrl,
        requestMethod: req.method,
        error: error.message
      });
    } catch (logErr) {}

    res.status(500).json({ message: error.message });
  }
};

