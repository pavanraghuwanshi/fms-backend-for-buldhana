const Driver = require("../model/driverModel");
const VehicleMaster = require("../model/maintenanceDevice.model");
const BuiltyCounter = require("../model/builtyCounterModel");
const DailyBuilty = require("../model/dailyBuilty.model");
const mongoose = require("mongoose");
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);


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
    if (req.query.supervisorModel) filter.supervisorModel = req.query.supervisorModel;
  }

  return filter;
};

const getAssignedVehicleDetails = async (driverId) => {
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

  return {
    driverName: driver.name,
    vehicleId: vehicle._id,
    vehicleName: vehicleNumber,
    vehicleNumber,
  };
};

exports.createDailyBuilty = async (req, res) => {
  try {
    if (!["superadmin", "user", "worker", "driver"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const payload = applyDailyBuiltyHierarchy(req, { ...req.body });

    if (payload.driveriId && !payload.driverId) payload.driverId = payload.driveriId;
    if (payload.consignorId && !payload.consignerId) payload.consignerId = payload.consignorId;
    if (payload.consgneeId && !payload.consigneeId) payload.consigneeId = payload.consgneeId;
    if (payload.consignor && !payload.consignerName) payload.consignerName = payload.consignor;

    if (payload.productId && (!payload.products || payload.products.length === 0)) {
      payload.products = [{ productId: payload.productId }];
    }

    const isValidObjectId = (id) => mongosoe.Types.ObjectId.isValid(id);

    if (req.user.role !== "driver" && !payload.driverId) {
      return res.status(400).json({ message: "driverId is required" });
    }

    if (!payload.supervisorId) return res.status(400).json({ message: "supervisorId is required" });
    if (!payload.supervisorModel) return res.status(400).json({ message: "supervisorModel is required" });

    if (!payload.driverId || !isValidObjectId(payload.driverId)) {
      return res.status(400).json({ message: "Valid driverId is required" });
    }

    if (!payload.consignerId || !isValidObjectId(payload.consignerId)) {
      return res.status(400).json({ message: "Valid consignerId is required" });
    }

    if (!payload.consigneeId || !isValidObjectId(payload.consigneeId)) {
      return res.status(400).json({ message: "Valid consigneeId is required" });
    }

    if (!payload.consignerName) {
      return res.status(400).json({ message: "consignerName is required" });
    }

    if (!payload.consigneeName) {
      return res.status(400).json({ message: "consigneeName is required" });
    }

    if (!payload.pickupLocationId || !isValidObjectId(payload.pickupLocationId)) {
      return res.status(400).json({ message: "Valid pickupLocationId is required" });
    }

    if (!payload.destinationLocationId || !isValidObjectId(payload.destinationLocationId)) {
      return res.status(400).json({ message: "Valid destinationLocationId is required" });
    }

    if (!payload.grossVehicleWeight) return res.status(400).json({ message: "grossVehicleWeight is required" });
    if (!payload.emptyWeight) return res.status(400).json({ message: "emptyWeight is required" });
    if (!payload.deliveryWeight) return res.status(400).json({ message: "deliveryWeight is required" });
    if (!payload.loadingWeight) return res.status(400).json({ message: "loadingWeight is required" });
    if (!payload.transportRate) return res.status(400).json({ message: "transportRate is required" });

    if (!payload.products || payload.products.length === 0) {
      return res.status(400).json({ message: "products/productId are required" });
    }

    for (const item of payload.products) {
      if (!item.productId || !isValidObjectId(item.productId)) {
        return res.status(400).json({ message: "Valid productId is required" });
      }
    }

    const assignedVehicle = await getAssignedVehicleDetails(payload.driverId);

    if (assignedVehicle.error) {
      return res.status(400).json({ message: assignedVehicle.error });
    }

    payload.driverName = assignedVehicle.driverName;
    payload.vehicleId = assignedVehicle.vehicleId;
    payload.vehicleName = assignedVehicle.vehicleName;
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
    filter.isActive = true;

    if (req.query.status) filter.status = req.query.status;

    if (req.query.driverId) {
      if (!isValidObjectId(req.query.driverId)) {
        return res.status(400).json({ message: "Invalid driverId" });
      }
      filter.driverId = req.query.driverId;
    }

    if (req.query.consignerId) {
      if (!isValidObjectId(req.query.consignerId)) {
        return res.status(400).json({ message: "Invalid consignerId" });
      }
      filter.consignerId = req.query.consignerId;
    }

    if (req.query.consigneeId) {
      if (!isValidObjectId(req.query.consigneeId)) {
        return res.status(400).json({ message: "Invalid consigneeId" });
      }
      filter.consigneeId = req.query.consigneeId;
    }

    if (req.query.vehicleId) {
      if (!isValidObjectId(req.query.vehicleId)) {
        return res.status(400).json({ message: "Invalid vehicleId" });
      }
      filter.vehicleId = req.query.vehicleId;
    }

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
        { vehicleName: { $regex: req.query.search, $options: "i" } },
        { driverName: { $regex: req.query.search, $options: "i" } },
        { consignerName: { $regex: req.query.search, $options: "i" } },
        { consigneeName: { $regex: req.query.search, $options: "i" } },
      ];
    }

    const [dailyBuilty, total] = await Promise.all([
      DailyBuilty.find(filter)
        .populate("driverId", "name contactNumber deviceId")
        .populate("vehicleId", "vehicleNumber make grossVehicleWeight")
        .populate("consignerId", "name contactNumber")
        .populate("consigneeId", "name contactNumber")
        .populate("pickupLocationId", "name")
        .populate("destinationLocationId", "name")
        .populate("products.productId", "productName name")
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

    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid daily builty id" });
    }

    const filter = buildDailyBuiltyFilter(req);
    filter._id = req.params.id;
    filter.isActive = true;

    const dailyBuilty = await DailyBuilty.findOne(filter)
      .populate("driverId", "name contactNumber deviceId")
      .populate("vehicleId", "vehicleNumber make grossVehicleWeight")
      .populate("consignerId", "name contactNumber")
      .populate("consigneeId", "name contactNumber")
      .populate("pickupLocationId", "name")
      .populate("destinationLocationId", "name")
      .populate("products.productId", "productName name");

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

    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid daily builty id" });
    }

    const filter = buildDailyBuiltyFilter(req);
    filter._id = req.params.id;
    filter.status = "Created";
    filter.isActive = true;

    const updateData = { ...req.body };

    if (updateData.driveriId && !updateData.driverId) {
      updateData.driverId = updateData.driveriId;
    }

    if (updateData.consignorId && !updateData.consignerId) {
      updateData.consignerId = updateData.consignorId;
    }

    if (updateData.consgneeId && !updateData.consigneeId) {
      updateData.consigneeId = updateData.consgneeId;
    }

    if (updateData.consignor && !updateData.consignerName) {
      updateData.consignerName = updateData.consignor;
    }

    if (updateData.productId && (!updateData.products || updateData.products.length === 0)) {
      updateData.products = [{ productId: updateData.productId }];
    }

    if (updateData.driverId && !isValidObjectId(updateData.driverId)) {
      return res.status(400).json({ message: "Invalid driverId" });
    }

    if (updateData.consignerId && !isValidObjectId(updateData.consignerId)) {
      return res.status(400).json({ message: "Invalid consignerId" });
    }

    if (updateData.consigneeId && !isValidObjectId(updateData.consigneeId)) {
      return res.status(400).json({ message: "Invalid consigneeId" });
    }

    if (updateData.pickupLocationId && !isValidObjectId(updateData.pickupLocationId)) {
      return res.status(400).json({ message: "Invalid pickupLocationId" });
    }

    if (updateData.destinationLocationId && !isValidObjectId(updateData.destinationLocationId)) {
      return res.status(400).json({ message: "Invalid destinationLocationId" });
    }

    if (updateData.products && updateData.products.length > 0) {
      for (const item of updateData.products) {
        if (!item.productId || !isValidObjectId(item.productId)) {
          return res.status(400).json({ message: "Invalid productId" });
        }
      }
    }

    delete updateData.driveriId;
    delete updateData.consignorId;
    delete updateData.consgneeId;
    delete updateData.consignor;

    delete updateData.tpNo;
    delete updateData.supervisorId;
    delete updateData.supervisorModel;
    delete updateData.createdBy;
    delete updateData.createdByRole;
    delete updateData.status;
    delete updateData.vehicleNumber;
    delete updateData.vehicleName;
    delete updateData.vehicleId;
    delete updateData.driverName;
    delete updateData.isActive;

    if (req.user.role === "driver") {
      delete updateData.driverId;
    }

    if (updateData.driverId) {
      const assignedVehicle = await getAssignedVehicleDetails(updateData.driverId);

      if (assignedVehicle.error) {
        return res.status(400).json({ message: assignedVehicle.error });
      }

      updateData.driverName = assignedVehicle.driverName;
      updateData.vehicleId = assignedVehicle.vehicleId;
      updateData.vehicleName = assignedVehicle.vehicleName;
      updateData.vehicleNumber = assignedVehicle.vehicleNumber.toUpperCase();
    }

    const dailyBuilty = await DailyBuilty.findOneAndUpdate(filter, updateData, {
      new: true,
    });

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

    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid daily builty id" });
    }

    const filter = buildDailyBuiltyFilter(req);
    filter._id = req.params.id;
    filter.status = "Created";
    filter.isActive = true;

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

    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid daily builty id" });
    }

    const filter = buildDailyBuiltyFilter(req);
    filter._id = req.params.id;
    filter.status = "Created";
    filter.isActive = true;

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

    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid daily builty id" });
    }

    const filter = buildDailyBuiltyFilter(req);
    filter._id = req.params.id;
    filter.isActive = true;

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