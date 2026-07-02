const BuiltyTemplate = require("../model/BuiltyTemplate");
const mongoose = require("mongoose");
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

    res.status(201).json({
      message: "Template created successfully",
      template: newTemplate
    });
  } catch (error) {

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

    const updatedTemplate = await BuiltyTemplate.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      message: "Template updated successfully",
      template: updatedTemplate,
    });

  } catch (error) {
    res.status(500).json({
      message: "Error updating template",
      error: error.message,
    });
  }
};