const Driver = require("../model/driverModel");
const VehicleMaster = require("../model/maintenanceDevice.model");
const BuiltyCounter = require("../model/builtyCounterModel")
const DailyBuilty = require("../model/dailyBuilty.model")

const roleModelMap = {
  school: "School",
  branch: "Branch",
  branchGroup: "BranchGroup",
};

const applyDailyBuiltyHierarchy = (req, payload) => {
  const role = req.user.role;
  const roleType = req.user.roleType;

  if (role === "driver") {
    payload.driverId = req.user.id;
    payload.supervisorId = req.user.supervisor;
    payload.supervisorModel =
      roleModelMap[roleType] || req.user.supervisorModel;
  }

  if (role === "user") {
    payload.supervisorId = req.user.id;
    payload.supervisorModel = roleModelMap[roleType];
  }

  if (role === "worker") {
    payload.workerId = req.user.id;
    payload.supervisorId = req.user.supervisor;
    payload.supervisorModel =
      roleModelMap[roleType] || req.user.supervisorModel;
  }

  return payload;
};

const buildDailyBuiltyFilter = (req) => {
  const role = req.user.role;
  const roleType = req.user.roleType;

  const filter = { isActive: true };

  if (role === "driver") {
    filter.driverId = req.user.id;
  }

  if (role === "user") {
    filter.supervisorId = req.user.id;
    filter.supervisorModel = roleModelMap[roleType];
  }

  if (role === "worker") {
    filter.supervisorId = req.user.supervisor;
    filter.supervisorModel =
      roleModelMap[roleType] || req.user.supervisorModel;
  }

  if (role === "superadmin") {
    if (req.query.supervisorId) filter.supervisorId = req.query.supervisorId;
    if (req.query.supervisorModel)
      filter.supervisorModel = req.query.supervisorModel;
  }

  return filter;
};

const getAssignedVehicleNumber = async (driverId) => {
  const driver = await Driver.findById(driverId).populate("deviceId");

  if (!driver) {
    return { error: "Driver not found" };
  }

  if (!driver.deviceId) {
    return { error: "Vehicle not assigned to driver" };
  }

  const vehicle = driver.deviceId;

  const vehicleNumber =
    vehicle.vehicleNumber ||
    vehicle.registrationNumber ||
    vehicle.name ||
    vehicle.vehicleNo;

  if (!vehicleNumber) {
    return { error: "Vehicle number not found in assigned vehicle" };
  }

  return { vehicleNumber };
};

exports.createDailyBuilty = async (req, res) => {
  try {
    if (!["superadmin", "user", "worker", "driver"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const payload = applyDailyBuiltyHierarchy(req, { ...req.body });

    if (req.user.role !== "driver" && !payload.driverId) {
      return res.status(400).json({ message: "driverId is required" });
    }

    if (!payload.supervisorId) {
      return res.status(400).json({ message: "supervisorId is required" });
    }

    if (!payload.supervisorModel) {
      return res.status(400).json({ message: "supervisorModel is required" });
    }

    if (!payload.consignerName) {
      return res.status(400).json({ message: "consignerName is required" });
    }

    if (!payload.consigneeName) {
      return res.status(400).json({ message: "consigneeName is required" });
    }

    if (!payload.pickupLocationId) {
      return res.status(400).json({ message: "pickupLocationId is required" });
    }

    if (!payload.destinationLocationId) {
      return res.status(400).json({
        message: "destinationLocationId is required",
      });
    }

    if (!payload.grossVehicleWeight) {
      return res.status(400).json({
        message: "grossVehicleWeight is required",
      });
    }

    if (!payload.products || payload.products.length === 0) {
      return res.status(400).json({ message: "products are required" });
    }

    const assignedVehicle = await getAssignedVehicleNumber(payload.driverId);

    if (assignedVehicle.error) {
      return res.status(400).json({ message: assignedVehicle.error });
    }

    payload.vehicleNumber = assignedVehicle.vehicleNumber.toUpperCase();

    const counter = await BuiltyCounter.findOneAndUpdate(
      {
        supervisorId: payload.supervisorId,
        supervisorModel: payload.supervisorModel,
        builtyType: "daily",
      },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    payload.tpNo = `DTP-${String(counter.seq).padStart(4, "0")}`;
    payload.createdBy = req.user.id;
    payload.createdByRole = req.user.role;
    payload.status = "Created";

    const dailyBuilty = await DailyBuilty.create(payload);

    return res.status(201).json({
      message: "Daily builty created successfully",
      dailyBuilty,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error creating daily builty",
      error: error.message,
    });
  }
};

exports.getAllDailyBuilty = async (req, res) => {
  try {
    if (!["superadmin", "user", "worker", "driver"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = buildDailyBuiltyFilter(req);

    if (req.query.status) filter.status = req.query.status;
    if (req.query.driverId) filter.driverId = req.query.driverId;

    if (req.query.fromDate || req.query.toDate) {
      filter.createdAt = {};

      if (req.query.fromDate) {
        filter.createdAt.$gte = new Date(req.query.fromDate);
      }

      if (req.query.toDate) {
        const toDate = new Date(req.query.toDate);
        toDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = toDate;
      }
    }

    if (req.query.search) {
      filter.$or = [
        { tpNo: { $regex: req.query.search, $options: "i" } },
        { vehicleNumber: { $regex: req.query.search, $options: "i" } },
        { consignerName: { $regex: req.query.search, $options: "i" } },
        { consigneeName: { $regex: req.query.search, $options: "i" } },
      ];
    }

    const [dailyBuilty, total] = await Promise.all([
      DailyBuilty.find(filter)
        .populate("driverId", "name contactNumber deviceId")
        .populate("pickupLocationId", "name")
        .populate("destinationLocationId", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      DailyBuilty.countDocuments(filter),
    ]);

    return res.status(200).json({
      message: "Daily builty fetched successfully",
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      dailyBuilty,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching daily builty",
      error: error.message,
    });
  }
};

exports.getDailyBuiltyById = async (req, res) => {
  try {
    if (!["superadmin", "user", "worker", "driver"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const filter = buildDailyBuiltyFilter(req);
    filter._id = req.params.id;

    const dailyBuilty = await DailyBuilty.findOne(filter)
      .populate("driverId", "name contactNumber deviceId")
      .populate("pickupLocationId", "name")
      .populate("destinationLocationId", "name");

    if (!dailyBuilty) {
      return res.status(404).json({ message: "Daily builty not found" });
    }

    return res.status(200).json({
      message: "Daily builty fetched successfully",
      dailyBuilty,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching daily builty",
      error: error.message,
    });
  }
};

exports.updateDailyBuilty = async (req, res) => {
  try {
    if (!["superadmin", "user", "worker", "driver"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const filter = buildDailyBuiltyFilter(req);
    filter._id = req.params.id;
    filter.status = "Created";

    const updateData = { ...req.body };

    delete updateData.tpNo;
    delete updateData.supervisorId;
    delete updateData.supervisorModel;
    delete updateData.createdBy;
    delete updateData.createdByRole;
    delete updateData.status;
    delete updateData.vehicleNumber;

    if (req.user.role === "driver") {
      delete updateData.driverId;
    }

    const dailyBuilty = await DailyBuilty.findOneAndUpdate(
      filter,
      updateData,
      { new: true }
    );

    if (!dailyBuilty) {
      return res.status(404).json({
        message: "Daily builty not found or cannot update after completed/cancelled",
      });
    }

    return res.status(200).json({
      message: "Daily builty updated successfully",
      dailyBuilty,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error updating daily builty",
      error: error.message,
    });
  }
};

exports.completeDailyBuilty = async (req, res) => {
  try {
    if (!["superadmin", "user", "worker", "driver"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const filter = buildDailyBuiltyFilter(req);
    filter._id = req.params.id;
    filter.status = "Created";

    const dailyBuilty = await DailyBuilty.findOneAndUpdate(
      filter,
      { status: "Completed" },
      { new: true }
    );

    if (!dailyBuilty) {
      return res.status(404).json({
        message: "Daily builty not found or already completed/cancelled",
      });
    }

    return res.status(200).json({
      message: "Daily builty completed successfully",
      dailyBuilty,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error completing daily builty",
      error: error.message,
    });
  }
};

exports.cancelDailyBuilty = async (req, res) => {
  try {
    if (!["superadmin", "user", "worker", "driver"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const filter = buildDailyBuiltyFilter(req);
    filter._id = req.params.id;
    filter.status = "Created";

    const dailyBuilty = await DailyBuilty.findOneAndUpdate(
      filter,
      {
        status: "Cancelled",
        cancelReason: req.body.cancelReason || "",
      },
      { new: true }
    );

    if (!dailyBuilty) {
      return res.status(404).json({
        message: "Daily builty not found or already completed/cancelled",
      });
    }

    return res.status(200).json({
      message: "Daily builty cancelled successfully",
      dailyBuilty,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error cancelling daily builty",
      error: error.message,
    });
  }
};

exports.deleteDailyBuilty = async (req, res) => {
  try {
    if (!["superadmin", "user", "worker"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const filter = buildDailyBuiltyFilter(req);
    filter._id = req.params.id;

    const dailyBuilty = await DailyBuilty.findOneAndUpdate(
      filter,
      { isActive: false },
      { new: true }
    );

    if (!dailyBuilty) {
      return res.status(404).json({ message: "Daily builty not found" });
    }

    return res.status(200).json({
      message: "Daily builty deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error deleting daily builty",
      error: error.message,
    });
  }
};