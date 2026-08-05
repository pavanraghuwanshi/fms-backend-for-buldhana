const VehicleCategory = require("../model/vehicleCategoryModel");
const { logAction } = require("../utils/logger");

exports.createVehicleCategory = async (req, res) => {
  try {
    const role = req.user.role;
    const roleType = req.user.roleType;

    if (!["superadmin", "user"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const roleModelMap = {
      school: "School",
      branch: "Branch",
      branchGroup: "BranchGroup",
    };

    if (
      roleType === "school" ||
      roleType === "branch" ||
      roleType === "branchGroup"
    ) {
      req.body.supervisorId = req.user.id;
      req.body.supervisorModel = roleModelMap[roleType];
    }

    if (!req.body.supervisorId) {
      return res.status(400).json({ message: "supervisorId is required" });
    }

    if (!req.body.supervisorModel) {
      return res.status(400).json({ message: "supervisorModel is required" });
    }

    const {
      categoryName,
      tyreCount,
      supervisorId,
      supervisorModel,
      status,
    } = req.body;

    if (!categoryName) {
      return res.status(400).json({ message: "categoryName is required" });
    }

    if (tyreCount === undefined) {
      return res.status(400).json({ message: "tyreCount is required" });
    }

    const existingCategory = await VehicleCategory.findOne({
      categoryName,
      supervisorId,
      supervisorModel,
    });

    if (existingCategory) {
      return res.status(400).json({
        message: "Vehicle category with this name already exists",
      });
    }

    const category = await VehicleCategory.create({
      categoryName,
      tyreCount,
      supervisorId,
      supervisorModel,
      status,
    });

    try {
      await logAction({
        userId: req.user?._id || req.user?.id,
        userType: req.user?.role || 'User',
        action: 'CREATE',
        module: 'VehicleCategory',
        recordId: category._id,
        oldData: null,
        newData: category && typeof category.toObject === 'function' ? category.toObject() : category,
        ipAddress: req.ip,
        userAgent: req.headers ? req.headers['user-agent'] : null,
        apiEndpoint: req.originalUrl,
        requestMethod: req.method,
        status: 'SUCCESS'
      });
    } catch (logError) {
      console.error("Audit log failed for createVehicleCategory:", logError);
    }

    return res.status(201).json({
      message: "Vehicle category created successfully",
      category,
    });
  } catch (error) {
    try {
      await logAction({
        userId: req.user?._id || req.user?.id,
        userType: req.user?.role || 'System',
        action: 'CREATE',
        module: 'VehicleCategory',
        recordId: null,
        status: 'FAILED',
        ipAddress: req.ip,
        userAgent: req.headers ? req.headers['user-agent'] : null,
        apiEndpoint: req.originalUrl,
        requestMethod: req.method,
        error: error.message
      });
    } catch (logErr) {}

    return res.status(500).json({
      message: "Error creating vehicle category",
      error: error.message,
    });
  }
};

exports.getVehicleCategories = async (req, res) => {
  try {
    const role = req.user.role;
    const roleType = req.user.roleType;

    if (!["superadmin", "user"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { page = 1, limit = 10, search, status, supervisorId } = req.query;

    const query = {};

    if (
      roleType === "school" ||
      roleType === "branch" ||
      roleType === "branchGroup"
    ) {
      query.supervisorId = req.user.id;
    } else if (supervisorId) {
      query.supervisorId = supervisorId;
    }

    if (status) query.status = status;

    if (search) {
      query.$or = [
        { categoryName: { $regex: search, $options: "i" } },
      ];
    }

    const categories = await VehicleCategory.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await VehicleCategory.countDocuments(query);

    return res.status(200).json({
      message: "Vehicle categories fetched successfully",
      total,
      page: Number(page),
      limit: Number(limit),
      categories,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching vehicle categories",
      error: error.message,
    });
  }
};

exports.getVehicleCategoryById = async (req, res) => {
  try {
    const role = req.user.role;
    const roleType = req.user.roleType;

    if (!["superadmin", "user"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const query = { _id: req.params.id };

    if (
      roleType === "school" ||
      roleType === "branch" ||
      roleType === "branchGroup"
    ) {
      query.supervisorId = req.user.id;
    }

    const category = await VehicleCategory.findOne(query);

    if (!category) {
      return res.status(404).json({ message: "Vehicle category not found" });
    }

    return res.status(200).json({
      message: "Vehicle category fetched successfully",
      category,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching vehicle category",
      error: error.message,
    });
  }
};

exports.updateVehicleCategory = async (req, res) => {
  try {
    const role = req.user.role;
    const roleType = req.user.roleType;

    if (!["superadmin", "user"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const query = { _id: req.params.id };

    if (
      roleType === "school" ||
      roleType === "branch" ||
      roleType === "branchGroup"
    ) {
      query.supervisorId = req.user.id;
    }

    const category = await VehicleCategory.findOne(query);

    if (!category) {
      return res.status(404).json({ message: "Vehicle category not found" });
    }

    const oldCategorySnapshot = category && typeof category.toObject === 'function' ? category.toObject() : category;

    const {
      categoryName,
      tyreCount,
      status,
    } = req.body;

    if (categoryName) category.categoryName = categoryName;
    if (tyreCount !== undefined) category.tyreCount = tyreCount;
    if (status) category.status = status;

    await category.save();

    try {
      await logAction({
        userId: req.user?._id || req.user?.id,
        userType: req.user?.role || 'User',
        action: 'UPDATE',
        module: 'VehicleCategory',
        recordId: category._id,
        oldData: oldCategorySnapshot,
        newData: category && typeof category.toObject === 'function' ? category.toObject() : category,
        ipAddress: req.ip,
        userAgent: req.headers ? req.headers['user-agent'] : null,
        apiEndpoint: req.originalUrl,
        requestMethod: req.method,
        status: 'SUCCESS'
      });
    } catch (logError) {
      console.error("Audit log failed for updateVehicleCategory:", logError);
    }

    return res.status(200).json({
      message: "Vehicle category updated successfully",
      category,
    });
  } catch (error) {
    try {
      await logAction({
        userId: req.user?._id || req.user?.id,
        userType: req.user?.role || 'System',
        action: 'UPDATE',
        module: 'VehicleCategory',
        recordId: req.params?.id || null,
        status: 'FAILED',
        ipAddress: req.ip,
        userAgent: req.headers ? req.headers['user-agent'] : null,
        apiEndpoint: req.originalUrl,
        requestMethod: req.method,
        error: error.message
      });
    } catch (logErr) {}

    return res.status(500).json({
      message: "Error updating vehicle category",
      error: error.message,
    });
  }
};

exports.deleteVehicleCategory = async (req, res) => {
  try {
    const role = req.user.role;
    const roleType = req.user.roleType;

    if (!["superadmin", "user"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const query = { _id: req.params.id };

    if (
      roleType === "school" ||
      roleType === "branch" ||
      roleType === "branchGroup"
    ) {
      query.supervisorId = req.user.id;
    }

    const oldCategory = await VehicleCategory.findOne(query);
    const oldCategorySnapshot = oldCategory && typeof oldCategory.toObject === 'function' ? oldCategory.toObject() : oldCategory;

    const category = await VehicleCategory.findOneAndDelete(query);

    if (!category) {
      return res.status(404).json({ message: "Vehicle category not found" });
    }

    try {
      await logAction({
        userId: req.user?._id || req.user?.id,
        userType: req.user?.role || 'User',
        action: 'DELETE',
        module: 'VehicleCategory',
        recordId: req.params.id,
        oldData: oldCategorySnapshot,
        newData: null,
        ipAddress: req.ip,
        userAgent: req.headers ? req.headers['user-agent'] : null,
        apiEndpoint: req.originalUrl,
        requestMethod: req.method,
        status: 'SUCCESS'
      });
    } catch (logError) {
      console.error("Audit log failed for deleteVehicleCategory:", logError);
    }

    return res.status(200).json({
      message: "Vehicle category deleted successfully",
    });
  } catch (error) {
    try {
      await logAction({
        userId: req.user?._id || req.user?.id,
        userType: req.user?.role || 'System',
        action: 'DELETE',
        module: 'VehicleCategory',
        recordId: req.params?.id || null,
        status: 'FAILED',
        ipAddress: req.ip,
        userAgent: req.headers ? req.headers['user-agent'] : null,
        apiEndpoint: req.originalUrl,
        requestMethod: req.method,
        error: error.message
      });
    } catch (logErr) {}

    return res.status(500).json({
      message: "Error deleting vehicle category",
      error: error.message,
    });
  }
};