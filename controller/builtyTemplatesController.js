const BuiltyTemplate = require("../model/BuiltyTemplate");
const mongoose = require("mongoose");
const { logAction } = require("../utils/logger");

exports.createTemplate = async (req, res) => {
  try {
    const { templateName } = req.body;
    if (req.user.role !== "user") {
      return res.status(403).json({ message: "Access denied: Only users can update templates." });
    }

    if (!templateName) {
      return res.status(400).json({ message: "templateName is required." });
    }

    const templateData = {
      ...req.body,
      supervisorId: req.user.id
    };

    const newTemplate = await BuiltyTemplate.create(templateData);

    try {
      await logAction({
        userId: req.user?._id || req.user?.id,
        userType: req.user?.role || 'User',
        action: 'CREATE',
        module: 'BuiltyTemplate',
        recordId: newTemplate._id,
        oldData: null,
        newData: newTemplate && typeof newTemplate.toObject === 'function' ? newTemplate.toObject() : newTemplate,
        ipAddress: req.ip,
        userAgent: req.headers ? req.headers['user-agent'] : null,
        apiEndpoint: req.originalUrl,
        requestMethod: req.method,
        status: 'SUCCESS'
      });
    } catch (logError) {
      console.error("Audit log failed for createTemplate:", logError);
    }

    res.status(201).json({
      message: "Template created successfully",
      template: newTemplate
    });
  } catch (error) {
    try {
      await logAction({
        userId: req.user?._id || req.user?.id,
        userType: req.user?.role || 'System',
        action: 'CREATE',
        module: 'BuiltyTemplate',
        recordId: null,
        status: 'FAILED',
        ipAddress: req.ip,
        userAgent: req.headers ? req.headers['user-agent'] : null,
        apiEndpoint: req.originalUrl,
        requestMethod: req.method,
        error: error.message
      });
    } catch (logErr) {}

    res.status(500).json({
      message: "Error creating template",
      error: error.message
    });
  }
};
exports.getBuiltyTemplates = async (req, res) => {
  try {

    if (!["superadmin", "user"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { page = 1, limit = 10, search, supervisorId } = req.query;

    const query = {};

    if (req.user.role === "user") {
      query.supervisorId = req.user.id;
    } else if (supervisorId) {
      query.supervisorId = supervisorId;
    }

    if (search) {
      query.$or = [
        { templateName: { $regex: search, $options: "i" } },
        { consignerName: { $regex: search, $options: "i" } },
        { consigneeName: { $regex: search, $options: "i" } },
        { vehicleNumber: { $regex: search, $options: "i" } }
      ];
    }

    const templates = await BuiltyTemplate.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    const total = await BuiltyTemplate.countDocuments(query);

    return res.status(200).json({
      message: "Templates fetched successfully",
      total,
      page: Number(page),
      limit: Number(limit),
      templates,
    });

  } catch (error) {
    return res.status(500).json({
      message: "Error fetching templates",
      error: error.message,
    });
  }
};

exports.updateBuiltyTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Template ID format" });
    }

    if (req.user.role !== "user") {
      return res.status(403).json({ message: "Access denied: Only users can update templates." });
    }

    const updateData = req.body;
    delete updateData.supervisorId;
    delete updateData._id;

    const template = await BuiltyTemplate.findById(id);
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    const oldTemplateSnapshot = template && typeof template.toObject === 'function' ? template.toObject() : template;

    const updatedTemplate = await BuiltyTemplate.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    try {
      await logAction({
        userId: req.user?._id || req.user?.id,
        userType: req.user?.role || 'User',
        action: 'UPDATE',
        module: 'BuiltyTemplate',
        recordId: id,
        oldData: oldTemplateSnapshot,
        newData: updatedTemplate && typeof updatedTemplate.toObject === 'function' ? updatedTemplate.toObject() : updatedTemplate,
        ipAddress: req.ip,
        userAgent: req.headers ? req.headers['user-agent'] : null,
        apiEndpoint: req.originalUrl,
        requestMethod: req.method,
        status: 'SUCCESS'
      });
    } catch (logError) {
      console.error("Audit log failed for updateBuiltyTemplate:", logError);
    }

    res.status(200).json({
      message: "Template updated successfully",
      template: updatedTemplate,
    });

  } catch (error) {
    try {
      await logAction({
        userId: req.user?._id || req.user?.id,
        userType: req.user?.role || 'System',
        action: 'UPDATE',
        module: 'BuiltyTemplate',
        recordId: req.params?.id || null,
        status: 'FAILED',
        ipAddress: req.ip,
        userAgent: req.headers ? req.headers['user-agent'] : null,
        apiEndpoint: req.originalUrl,
        requestMethod: req.method,
        error: error.message
      });
    } catch (logErr) {}

    res.status(500).json({
      message: "Error updating template",
      error: error.message,
    });
  }
};

exports.deleteBuiltyTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid Template ID format",
      });
    }

    if (req.user.role !== "user") {
      return res.status(403).json({
        message: "Access denied: Only users can delete templates.",
      });
    }

    const template = await BuiltyTemplate.findById(id);

    if (!template) {
      return res.status(404).json({
        message: "Template not found",
      });
    }

    const oldTemplateSnapshot = template && typeof template.toObject === 'function' ? template.toObject() : template;

    // if (template.supervisorId.toString() !== req.user.id) {
    //   return res.status(403).json({
    //     message: "You are not authorized to delete this template.",
    //   });
    // }

    await BuiltyTemplate.findByIdAndDelete(id);

    try {
      await logAction({
        userId: req.user?._id || req.user?.id,
        userType: req.user?.role || 'User',
        action: 'DELETE',
        module: 'BuiltyTemplate',
        recordId: id,
        oldData: oldTemplateSnapshot,
        newData: null,
        ipAddress: req.ip,
        userAgent: req.headers ? req.headers['user-agent'] : null,
        apiEndpoint: req.originalUrl,
        requestMethod: req.method,
        status: 'SUCCESS'
      });
    } catch (logError) {
      console.error("Audit log failed for deleteBuiltyTemplate:", logError);
    }

    return res.status(200).json({
      message: "Template deleted successfully",
    });
  } catch (error) {
    try {
      await logAction({
        userId: req.user?._id || req.user?.id,
        userType: req.user?.role || 'System',
        action: 'DELETE',
        module: 'BuiltyTemplate',
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
      message: "Error deleting template",
      error: error.message,
    });
  }
};