const Railhead = require('../model/Railhead');
const { logAction } = require("../utils/logger");

// CREATE
exports.createRailhead = async (req, res) => {
  try {
    const { roleType, id } = req.user;

    const payload = {
      ...req.body,
      supervisorId: id // ✅ always from logged-in user
    };

    const data = await Railhead.create(payload);

    try {
      await logAction({
        userId: req.user?._id || req.user?.id,
        userType: req.user?.role || 'User',
        action: 'CREATE',
        module: 'Railhead',
        recordId: data._id,
        oldData: null,
        newData: data && typeof data.toObject === 'function' ? data.toObject() : data,
        ipAddress: req.ip,
        userAgent: req.headers ? req.headers['user-agent'] : null,
        apiEndpoint: req.originalUrl,
        requestMethod: req.method,
        status: 'SUCCESS'
      });
    } catch (logError) {
      console.error("Audit log failed for createRailhead:", logError);
    }

    res.status(201).json(data);
  } catch (error) {
    try {
      await logAction({
        userId: req.user?._id || req.user?.id,
        userType: req.user?.role || 'System',
        action: 'CREATE',
        module: 'Railhead',
        recordId: null,
        status: 'FAILED',
        ipAddress: req.ip,
        userAgent: req.headers ? req.headers['user-agent'] : null,
        apiEndpoint: req.originalUrl,
        requestMethod: req.method,
        error: error.message
      });
    } catch (logErr) {}

    res.status(400).json({ message: error.message });
  }
};

// GET ALL
exports.getRailheads = async (req, res) => {
  try {
    const {role, roleType, id, AssignedBranch = [] } = req.user;

    let { page = 1, limit = 10, fromDate, toDate } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const filter = {};

    // 🔥 ROLE BASED FILTER
    if (roleType === "school") {
      filter.supervisorId = id;
    }

    if (roleType === "branch") {
      filter.supervisorId = id;
    }

    if (roleType === "branchGroup") {
      filter.supervisorId = id;
    }

    if (role === "worker") filter.supervisorId = req.user.supervisor;

    // superadmin → no filter

    // 📅 DATE FILTER
    if (fromDate || toDate) {
      filter.createdAt = {};

      if (fromDate) filter.createdAt.$gte = new Date(fromDate);

      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDate;
      }
    }

    const data = await Railhead.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Railhead.countDocuments(filter);

    return res.status(200).json({
      total,
      page,
      limit,
      data,
    });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


// GET BY ID
exports.getRailheadById = async (req, res) => {
  try {
    const { roleType, id, AssignedBranch = [] } = req.user;

    let filter = { _id: req.params.id };

    // 🔥 ROLE CHECK
    if (roleType === "school" || roleType === "branch") {
      filter.supervisor = id;
    }

    if (roleType === "branchGroup") {
      filter.supervisor = id;
    }

    const data = await Railhead.findOne(filter).populate("productId");

    if (!data) {
      return res.status(404).json({ message: "Not found or unauthorized" });
    }

    res.json(data);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE
exports.updateRailhead = async (req, res) => {
  try {
    const { roleType, id, AssignedBranch = [] } = req.user;

    const updates = req.body;

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No fields provided" });
    }

    let filter = { _id: req.params.id };

    // 🔥 ROLE CHECK
    if (roleType === "school" || roleType === "branch") {
      filter.supervisorId = id;
    }

    if (roleType === "branchGroup") {
      filter.supervisorId = id;
    }

    const oldData = await Railhead.findOne(filter);
    const oldDataSnapshot = oldData && typeof oldData.toObject === 'function' ? oldData.toObject() : oldData;

    const updated = await Railhead.findOneAndUpdate(
      filter,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Not found or unauthorized" });
    }

    try {
      await logAction({
        userId: req.user?._id || req.user?.id,
        userType: req.user?.role || 'User',
        action: 'UPDATE',
        module: 'Railhead',
        recordId: req.params.id,
        oldData: oldDataSnapshot,
        newData: updated && typeof updated.toObject === 'function' ? updated.toObject() : updated,
        ipAddress: req.ip,
        userAgent: req.headers ? req.headers['user-agent'] : null,
        apiEndpoint: req.originalUrl,
        requestMethod: req.method,
        status: 'SUCCESS'
      });
    } catch (logError) {
      console.error("Audit log failed for updateRailhead:", logError);
    }

    res.json(updated);

  } catch (error) {
    try {
      await logAction({
        userId: req.user?._id || req.user?.id,
        userType: req.user?.role || 'System',
        action: 'UPDATE',
        module: 'Railhead',
        recordId: req.params?.id || null,
        status: 'FAILED',
        ipAddress: req.ip,
        userAgent: req.headers ? req.headers['user-agent'] : null,
        apiEndpoint: req.originalUrl,
        requestMethod: req.method,
        error: error.message
      });
    } catch (logErr) {}

    res.status(400).json({ message: error.message });
  }
};


// DELETE
exports.deleteRailhead = async (req, res) => {
  try {
    const { roleType, id, AssignedBranch = [] } = req.user;

    let filter = { _id: req.params.id };

    if (roleType === "school" || roleType === "branch") {
      filter.supervisor = id;
    }

    if (roleType === "branchGroup") {
      filter.supervisor = id;
    }

    const oldData = await Railhead.findOne(filter);
    const oldDataSnapshot = oldData && typeof oldData.toObject === 'function' ? oldData.toObject() : oldData;

    const data = await Railhead.findOneAndDelete(filter);

    if (!data) {
      return res.status(404).json({ message: "Not found or unauthorized" });
    }

    try {
      await logAction({
        userId: req.user?._id || req.user?.id,
        userType: req.user?.role || 'User',
        action: 'DELETE',
        module: 'Railhead',
        recordId: req.params.id,
        oldData: oldDataSnapshot,
        newData: null,
        ipAddress: req.ip,
        userAgent: req.headers ? req.headers['user-agent'] : null,
        apiEndpoint: req.originalUrl,
        requestMethod: req.method,
        status: 'SUCCESS'
      });
    } catch (logError) {
      console.error("Audit log failed for deleteRailhead:", logError);
    }

    res.json({ message: "Deleted successfully" });

  } catch (error) {
    try {
      await logAction({
        userId: req.user?._id || req.user?.id,
        userType: req.user?.role || 'System',
        action: 'DELETE',
        module: 'Railhead',
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
