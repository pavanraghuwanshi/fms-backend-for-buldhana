const VehicleMaster = require("../model/maintenanceDevice.model");
const mongoose = require('mongoose');
const Driver = require("../model/driverModel");

exports.createVehicleMaster = async (req, res) => {
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

    // auto assign supervisor
    if (
      roleType === "school" ||
      roleType === "branch" ||
      roleType === "branchGroup"
    ) {
      req.body.supervisorId = req.user.id;
      req.body.supervisorModel = roleModelMap[roleType];
    }

    if (!req.body.supervisorId) {
      return res.status(400).json({
        message: "supervisorId is required",
      });
    }

    if (!req.body.supervisorModel) {
      return res.status(400).json({
        message: "supervisorModel is required",
      });
    }

    const {
      vehicleNumber,
      categoryId,
      make,
      grossVehicleWeight,
      transporterId,
      supervisorId,
      supervisorModel,
    } = req.body;

    if (!vehicleNumber || !categoryId || grossVehicleWeight === undefined) {
      return res.status(400).json({
        message:
          "vehicleNumber, categoryId and grossVehicleWeight are required",
      });
    }

    const existingVehicle = await VehicleMaster.findOne({
      vehicleNumber: vehicleNumber.toUpperCase(),
      supervisorId,
      supervisorModel,
    });

    if (existingVehicle) {
      return res.status(400).json({
        message: "Vehicle with this number already exists",
      });
    }

    const vehicle = await VehicleMaster.create({
      vehicleNumber: vehicleNumber.toUpperCase(),
      categoryId,
      make,
      grossVehicleWeight,
      transporterId,
      supervisorId,
      supervisorModel,
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
      categoryId,
    } = req.query;

    const query = {};

    if (role === "user") {
      query.supervisorId = req.user.id;
    } else if (req.query.supervisorId) {
      query.supervisorId = req.query.supervisorId;
    }

    if (transporterId) query.transporterId = transporterId;
    if (categoryId) query.categoryId = categoryId;

    if (search) {
      query.$or = [
        { vehicleNumber: { $regex: search, $options: "i" } },
        { make: { $regex: search, $options: "i" } },
      ];
    }

    const vehicles = await VehicleMaster.find(query)
      .populate("transporterId")
      .populate("categoryId")
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await VehicleMaster.countDocuments(query);

    return res.status(200).json({
      message: "Vehicles fetched successfully",
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
      count: vehicles.length,
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
      .populate("categoryId")
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


exports.getVehicleMasterDropdown = async (req, res) => {
  try {
    const role = req.user.role;
    if (!["superadmin", "user", "worker", "vendor"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const {
      type,
      transporterId,
      supervisorId,
      search = "",
      page = 1,
      limit = 20,
    } = req.query;

    const currentPage = Math.max(Number(page) || 1, 1);
    const perPage = Math.max(Number(limit) || 20, 1);
    const skip = (currentPage - 1) * perPage;

    const query = {
      isAssigned: false,
    };

    if (role === "user") {
      query.supervisorId = req.user.id;
    } else if (role === "worker") {
      query.supervisorId = req.user.supervisor;
    } else if (role === "vendor") {
      query.supervisorId = req.user.supervisorId;

    } else if (supervisorId) {
      query.supervisorId = supervisorId;
    }

    // type = our / transporter
    if (type === "our") {
      query.transporterId = null;
    }

    if (type === "transporter") {
      query.transporterId = { $ne: null };
    }

    // specific transporter selected
    if (transporterId) {
      query.transporterId = transporterId;
    }

    if (search.trim()) {
      query.vehicleNumber = {
        $regex: search.trim(),
        $options: "i",
      };
    }

    const [vehicles, total] = await Promise.all([
      VehicleMaster.find(query)
        .select("_id vehicleNumber transporterId grossVehicleWeight")
        .sort({ vehicleNumber: 1 })
        .skip(skip)
        .limit(perPage)
        .lean(),

      VehicleMaster.countDocuments(query),
    ]);

    return res.status(200).json({
      message: "Vehicle dropdown fetched successfully",
      pagination: {
        total,
        page: currentPage,
        limit: perPage,
        totalPages: Math.ceil(total / perPage),
      },
      vehicles: vehicles.map((v) => ({
        _id: v._id,
        vehicleNumber: v.vehicleNumber,
        transporterId: v.transporterId || null,
        grossVehicleWeight: v.grossVehicleWeight || null,
        vehicleType: v.transporterId ? "transporter" : "our",
      })),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching vehicle dropdown",
      error: error.message,
    });
  }
};

exports.getVehicleMasterDropdownall = async (req, res) => {
  try {
    const { role, id, supervisor, supervisorId: userSupervisorId } = req.user;

    if (!["superadmin", "user", "worker", "vendor"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { type, transporterId, supervisorId, search = "", page = 1, limit = 20 } = req.query;

    const perPage = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const currentPage = Math.max(Number(page) || 1, 1);
    const skip = (currentPage - 1) * perPage;

    const query = {};

    if (role === "user") {
      query.supervisorId = id;
    } else if (role === "worker") {
      query.supervisorId = supervisor;
    } else if (role === "vendor") {
      query.supervisorId = userSupervisorId;
    } else if (supervisorId) {
      query.supervisorId = supervisorId;
    }

    if (type === "our") {
      query.transporterId = null;
    } else if (type === "transporter") {
      query.transporterId = { $ne: null };
    }

    if (transporterId) {
      query.transporterId = transporterId;
    }

    if (search.trim()) {
      const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.vehicleNumber = { $regex: escapedSearch, $options: "i" };
    }

    const [vehicles, total] = await Promise.all([
      VehicleMaster.find(query)
        .select("_id vehicleNumber transporterId grossVehicleWeight")
        .sort({ vehicleNumber: 1 })
        .skip(skip)
        .limit(perPage)
        .lean(),

      VehicleMaster.countDocuments(query),
    ]);

    // 5. Response
    return res.status(200).json({
      message: "Vehicle dropdown fetched successfully",
      pagination: {
        total,
        page: currentPage,
        limit: perPage,
        totalPages: Math.ceil(total / perPage),
      },
      vehicles: vehicles.map((v) => ({
        _id: v._id,
        vehicleNumber: v.vehicleNumber,
        transporterId: v.transporterId || null,
        grossVehicleWeight: v.grossVehicleWeight || null,
        vehicleType: v.transporterId ? "transporter" : "our",
      })),
    });
  } catch (error) {
    console.error("Vehicle Dropdown Error:", error);
    return res.status(500).json({ message: "Error fetching vehicle dropdown", error: error.message });
  }
};

exports.updateVehicleStatus = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { isAssigned, forceUpdate = false } = req.body; 

    if (!mongoose.Types.ObjectId.isValid(vehicleId)) {
      return res.status(400).json({ success: false, message: "Invalid Vehicle ID format" });
    }
    
    if (!["superadmin", "user", "worker"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    if (typeof isAssigned !== 'boolean') {
      return res.status(400).json({ success: false, message: "isAssigned must be a boolean (true/false)" });
    }
    
    const query = { _id: vehicleId };

    if (req.user.role !== "superadmin") {
      query.supervisorId = req.user.role === "user" ? req.user.id : req.user.supervisor;
    }

    const vehicle = await VehicleMaster.findOne(query);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found or you do not have permission to update it"
      });
    }

    if (isAssigned === false && vehicle.isAssigned === false) {
      return res.status(400).json({ 
        success: false, 
        message: "This vehicle is already unassigned. It is not assigned to anyone." 
      });
    }

    if (isAssigned === false && forceUpdate === false) {
      return res.status(400).json({
        success: false,
        message: "Are you sure? then send yes..."
      });
    }

    // Update the vehicle
    vehicle.isAssigned = isAssigned;
    await vehicle.save(); 

    if (isAssigned === false) {
      console.log("entered in helper function");
      await unassignDriverFromVehicle(vehicle._id);
    }

    return res.status(200).json({
      success: true,
      message: `Vehicle status successfully updated to ${isAssigned ? 'Assigned' : 'Available'}`,
      data: vehicle
    });

  } catch (error) {
    console.error("Update Vehicle Status Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const unassignDriverFromVehicle = async (vehicleId) => {
  try {
console.log("entered in helper function step 3");
    await Driver.findOneAndUpdate(
      { deviceId: vehicleId }, 
      { 
        $set: { 
          deviceId: null, 
          isAssigned: false,
          currentVehicle: null,
          currentVehicleName: null
        } 
      },
      { new: true } // Returns the updated document
    );
  } catch (error) {
    console.error("Helper Error - unassignDriverFromVehicle:", error);
    throw new Error("Failed to unassign driver from vehicle");
  }
};