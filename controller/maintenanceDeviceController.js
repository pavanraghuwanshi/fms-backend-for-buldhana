const VehicleMaster = require("../model/maintenanceDevice.model");




exports.createVehicleMaster = async (req, res) => {
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
      vehicleNumber,
      category,
      make,
      emptyVehicleWeight,
      grossVehicleWeight,
      transporterId,
      supervisorId,
    } = req.body;

    if (!vehicleNumber || !category || !make || emptyVehicleWeight === undefined) {
      return res.status(400).json({
        message:
          "vehicleNumber, category, make and emptyVehicleWeight are required",
      });
    }

    const existingVehicle = await VehicleMaster.findOne({
      vehicleNumber: vehicleNumber.toUpperCase(),
      supervisorId,
    });

    if (existingVehicle) {
      return res.status(400).json({
        message: "Vehicle with this number already exists",
      });
    }

    const vehicle = await VehicleMaster.create({
      vehicleNumber,
      category,
      make,
      emptyVehicleWeight,
      grossVehicleWeight,
      transporterId,
      supervisorId,
    });

    return res.status(201).json({
      message: "Vehicle created successfully",
      vehicle,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error creating vehicle",
      error: error.message,
    });
  }
};

exports.getVehicleMasters = async (req, res) => {
  try {
    const role = req.user.role;

    if (!["superadmin", "user"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const {
      page = 1,
      limit = 10,
      search,
      transporterId,
      category,
    } = req.query;

    const query = {};

    if (role === "user") {
      query.supervisorId = req.user.id;
    } else if (req.query.supervisorId) {
      query.supervisorId = req.query.supervisorId;
    }

    if (transporterId) query.transporterId = transporterId;
    if (category) query.category = category;

    if (search) {
      query.$or = [
        { vehicleNumber: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { make: { $regex: search, $options: "i" } },
      ];
    }

    const vehicles = await VehicleMaster.find(query)
      .populate("transporterId")
      .populate("supervisorId", "name email mobile")
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await VehicleMaster.countDocuments(query);

    return res.status(200).json({
      message: "Vehicles fetched successfully",
      total,
      page: Number(page),
      limit: Number(limit),
      vehicles,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching vehicles",
      error: error.message,
    });
  }
};

exports.getVehicleMasterById = async (req, res) => {
  try {
    const role = req.user.role;

    if (!["superadmin", "user"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const query = { _id: req.params.id };

    if (role === "user") {
      query.supervisorId = req.user.id;
    }

    const vehicle = await VehicleMaster.findOne(query)
      .populate("transporterId")
      .populate("supervisorId", "name email mobile");

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    return res.status(200).json({
      message: "Vehicle fetched successfully",
      vehicle,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching vehicle",
      error: error.message,
    });
  }
};

exports.updateVehicleMaster = async (req, res) => {
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

    if (req.body.vehicleNumber) {
      const existingVehicle = await VehicleMaster.findOne({
        vehicleNumber: req.body.vehicleNumber.toUpperCase(),
        _id: { $ne: req.params.id },
        supervisorId:
          role === "user" ? req.user.id : req.body.supervisorId || req.query.supervisorId,
      });

      if (existingVehicle) {
        return res.status(400).json({
          message: "Vehicle with this number already exists",
        });
      }
    }

    const vehicle = await VehicleMaster.findOneAndUpdate(query, req.body, {
      new: true,
    });

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    return res.status(200).json({
      message: "Vehicle updated successfully",
      vehicle,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error updating vehicle",
      error: error.message,
    });
  }
};

exports.deleteVehicleMaster = async (req, res) => {
  try {
    const role = req.user.role;

    if (!["superadmin", "user"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const query = { _id: req.params.id };

    if (role === "user") {
      query.supervisorId = req.user.id;
    }

    const vehicle = await VehicleMaster.findOneAndDelete(query);

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    return res.status(200).json({
      message: "Vehicle deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error deleting vehicle",
      error: error.message,
    });
  }
};