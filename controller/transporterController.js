const Transporter = require("../model/transporterModel");

exports.createTransporter = async (req, res) => {
  try {
    const role = req.user.role;

    if (!["superadmin", "user"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (role === "user") req.body.supervisorId = req.user.id;

    if (!req.body.supervisorId) {
      return res.status(400).json({ message: "supervisorId is required" });
    }

    const {
      transporterName,
      contactPerson,
      contactNumber,
      email,
      address,
      gstNumber,
      panNumber,
      supervisorId,
      status,
    } = req.body;

    if (!transporterName) {
      return res.status(400).json({
        message: "transporterName is required",
      });
    }

    const existingTransporter = await Transporter.findOne({
      transporterName,
      supervisorId,
    });

    if (existingTransporter) {
      return res.status(400).json({
        message: "Transporter with this name already exists",
      });
    }

    const transporter = await Transporter.create({
      transporterName,
      contactPerson,
      contactNumber,
      email,
      address,
      gstNumber,
      panNumber,
      supervisorId,
      status,
    });

    return res.status(201).json({
      message: "Transporter created successfully",
      transporter,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error creating transporter",
      error: error.message,
    });
  }
};

exports.getTransporters = async (req, res) => {
  try {
    const role = req.user.role;

    if (!["superadmin", "user"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { page = 1, limit = 10, search, status } = req.query;

    const query = {};

    if (role === "user") {
      query.supervisorId = req.user.id;
    } else if (req.query.supervisorId) {
      query.supervisorId = req.query.supervisorId;
    }

    if (status) query.status = status;

    if (search) {
      query.$or = [
        { transporterName: { $regex: search, $options: "i" } },
        { contactPerson: { $regex: search, $options: "i" } },
        { contactNumber: { $regex: search, $options: "i" } },
        { gstNumber: { $regex: search, $options: "i" } },
        { panNumber: { $regex: search, $options: "i" } },
      ];
    }

    const transporters = await Transporter.find(query)
      .populate("supervisorId", "name email mobile")
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Transporter.countDocuments(query);

    return res.status(200).json({
      message: "Transporters fetched successfully",
      total,
      page: Number(page),
      limit: Number(limit),
      transporters,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching transporters",
      error: error.message,
    });
  }
};

exports.getTransporterById = async (req, res) => {
  try {
    const role = req.user.role;

    if (!["superadmin", "user"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const query = { _id: req.params.id };

    if (role === "user") {
      query.supervisorId = req.user.id;
    }

    const transporter = await Transporter.findOne(query).populate(
      "supervisorId",
      "name email mobile"
    );

    if (!transporter) {
      return res.status(404).json({ message: "Transporter not found" });
    }

    return res.status(200).json({
      message: "Transporter fetched successfully",
      transporter,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching transporter",
      error: error.message,
    });
  }
};

exports.updateTransporter = async (req, res) => {
  try {
    const role = req.user.role;

    if (!["superadmin", "user"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const query = { _id: req.params.id };

    if (role === "user") {
      query.supervisorId = req.user.id;
      req.body.supervisorId = req.user.id;
    }

    if (req.body.transporterName) {
      const existingTransporter = await Transporter.findOne({
        transporterName: req.body.transporterName,
        _id: { $ne: req.params.id },
        supervisorId:
          role === "user"
            ? req.user.id
            : req.body.supervisorId || req.query.supervisorId,
      });

      if (existingTransporter) {
        return res.status(400).json({
          message: "Transporter with this name already exists",
        });
      }
    }

    const transporter = await Transporter.findOneAndUpdate(query, req.body, {
      new: true,
    });

    if (!transporter) {
      return res.status(404).json({ message: "Transporter not found" });
    }

    return res.status(200).json({
      message: "Transporter updated successfully",
      transporter,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error updating transporter",
      error: error.message,
    });
  }
};

exports.deleteTransporter = async (req, res) => {
  try {
    const role = req.user.role;

    if (!["superadmin", "user"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const query = { _id: req.params.id };

    if (role === "user") {
      query.supervisorId = req.user.id;
    }

    const transporter = await Transporter.findOneAndDelete(query);

    if (!transporter) {
      return res.status(404).json({ message: "Transporter not found" });
    }

    return res.status(200).json({
      message: "Transporter deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error deleting transporter",
      error: error.message,
    });
  }
};