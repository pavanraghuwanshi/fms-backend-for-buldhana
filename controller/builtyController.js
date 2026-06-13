const mongoose = require("mongoose");
const Builty = require("../model/builtyModel");
const BuiltyCounter = require("../model/builtyCounterModel");
const VehicleMaster = require("../model/maintenanceDevice.model");
const Driver = require("../model/driverModel");
const { notifyVendor } = require('../services/notificationService');

const roleModelMap = {
  school: "School",
  branch: "Branch",
  branchGroup: "BranchGroup",
};

const applyHierarchy = (req, payload) => {
  const role = req.user.role;
  const roleType = req.user.roleType;

  if (role === "user") {
    payload.supervisorId = req.user.id;
    payload.supervisorModel = roleModelMap[roleType];
  }

  if (role === "worker") {
    payload.workerId = req.user.id;
    payload.supervisorId = req.user.supervisor;
    payload.supervisorModel = roleModelMap[roleType] || req.user.supervisorModel;
  }

  return payload;
};

exports.createBuilty = async (req, res) => {
  try {
    if (!["superadmin", "user", "worker"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const payload = applyHierarchy(req, req.body);

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

    if (!payload.consignerId) {
      return res.status(400).json({ message: "consignerId is required" });
    }

    if (!payload.consigneeId) {
      return res.status(400).json({ message: "consigneeId is required" });
    }

    if (!payload.pickupLocationId) {
      return res.status(400).json({ message: "pickupLocationId is required" });
    }

    if (!payload.destinationLocationId) {
      return res.status(400).json({ message: "destinationLocationId is required" });
    }

    if (!payload.vehicleOwnership) {
      return res.status(400).json({ message: "vehicleOwnership is required" });
    }

    if (!payload.bookingMode) {
      return res.status(400).json({ message: "bookingMode is required" });
    }

    if (!payload.vehicleNumber && !payload.vehicleId) {
      return res.status(400).json({ message: "vehicleNumber or vehicleId is required" });
    }
    if (payload.vendorId && (payload.advanceMode === "fuel" || payload.advanceMode === "cash_fuel")) {
      return res.status(400).json({ message: "vendorId should not be provided" });
    }

    if (!payload.products || payload.products.length === 0) {
      return res.status(400).json({ message: "products are required" });
    }

    if (payload.vehicleId) {
      const vehicle = await VehicleMaster.findById(payload.vehicleId);

      if (!vehicle) {
        return res.status(404).json({ message: "Vehicle not found" });
      }

      if (vehicle.isAssigned) {
        return res.status(400).json({
          message: "Vehicle is already assigned to another active builty",
        });
      }

      payload.vehicleNumber = vehicle.vehicleNumber;
      payload.grossVehicleWeight = vehicle.grossVehicleWeight;
    }

    if (!payload.grossVehicleWeight) {
      return res.status(400).json({ message: "grossVehicleWeight is required" });
    }

    if (payload.bookingMode === "transporter" && !payload.transporterId) {
      return res.status(400).json({ message: "transporterId is required" });
    }

    if (payload.bookingMode === "commissionAgent" && !payload.commissionAgentId) {
      return res.status(400).json({ message: "commissionAgentId is required" });
    }
    if (payload.vendorId && (payload.advanceMode === "fuel" || payload.advanceMode === "cash_fuel")) {
      return res.status(400).json({ message: "vendorId should not be provided" });
    }

    const counter = await BuiltyCounter.findOneAndUpdate(
      {
        supervisorId: payload.supervisorId,
        supervisorModel: payload.supervisorModel,
      },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    payload.tpNo = `TP-${String(counter.seq).padStart(4, "0")}`;
    payload.vehicleNumber = payload.vehicleNumber.toUpperCase();
    payload.createdBy = req.user.id;
    payload.createdByRole = req.user.role;
    payload.status = "Created";

    const builty = await Builty.create(payload);

    if (payload.vendorId) {
      notifyVendor(payload.vendorId, builty).catch(err => {
        console.error("Async notification background error:", err);
      });
    }
    
    if (payload.vehicleId) {
      await VehicleMaster.findByIdAndUpdate(payload.vehicleId, {
        isAssigned: true,
      });
    }
    if (payload.driverId) {
      await Driver.findByIdAndUpdate(payload.driverId, {
        $set: {
          isAssigned: true,
          deviceId: payload.vehicleId || null,
        },
      });
    }

    return res.status(201).json({
      message: "Builty created successfully",
      builty,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error creating builty",
      error: error.message,
    });
  }
};


exports.updateBuilty = async (req, res) => {
  try {
    if (!["superadmin", "user", "worker"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { id } = req.params;

    const payload = applyHierarchy(req, req.body);

    const builty = await Builty.findById(id);

    if (!builty) {
      return res.status(404).json({ message: "Builty not found" });
    }

    if (
      String(builty.supervisorId) !== String(payload.supervisorId) ||
      builty.supervisorModel !== payload.supervisorModel
    ) {
      return res.status(403).json({ message: "Access denied for this builty" });
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

    if (!payload.consignerId) {
      return res.status(400).json({ message: "consignerId is required" });
    }

    if (!payload.consigneeId) {
      return res.status(400).json({ message: "consigneeId is required" });
    }

    if (!payload.destinationLocationId) {
      return res.status(400).json({ message: "destinationLocationId is required" });
    }

    if (!payload.pickupLocationId) {
      return res.status(400).json({ message: "pickupLocationId is required" });
    }

    if (!payload.vehicleOwnership) {
      return res.status(400).json({ message: "vehicleOwnership is required" });
    }

    if (!payload.bookingMode) {
      return res.status(400).json({ message: "bookingMode is required" });
    }

    if (!payload.vehicleNumber && !payload.vehicleId) {
      return res.status(400).json({ message: "vehicleNumber or vehicleId is required" });
    }

    if (payload.vehicleId) {
      const vehicle = await VehicleMaster.findById(payload.vehicleId).lean();

      if (!vehicle) {
        return res.status(404).json({ message: "Vehicle not found" });
      }

      payload.vehicleNumber = vehicle.vehicleNumber;
      payload.grossVehicleWeight = vehicle.grossVehicleWeight;
    }

    if (!payload.grossVehicleWeight) {
      return res.status(400).json({ message: "grossVehicleWeight is required" });
    }

    if (payload.bookingMode === "transporter" && !payload.transporterId) {
      return res.status(400).json({ message: "transporterId is required" });
    }

    if (payload.bookingMode === "commissionAgent" && !payload.commissionAgentId) {
      return res.status(400).json({ message: "commissionAgentId is required" });
    }

    if (payload.bookingMode === "transporter") {
      payload.commissionAgentId = null;
    }

    if (payload.bookingMode === "commissionAgent") {
      payload.transporterId = null;
    }

    if (payload.vehicleNumber) {
      payload.vehicleNumber = payload.vehicleNumber.toUpperCase();
    }

    delete payload.tpNo;
    delete payload.createdBy;
    delete payload.createdByRole;

    const updatedBuilty = await Builty.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });

    return res.status(200).json({
      message: "Builty updated successfully",
      builty: updatedBuilty,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error updating builty",
      error: error.message,
    });
  }
};

exports.updateLoadingWeight = async (req, res) => {
  try {
    if (!["superadmin", "user", "worker", "driver"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { loadingEmptyWeight, loadingLoadedWeight } = req.body;

    if (loadingEmptyWeight === undefined || loadingLoadedWeight === undefined) {
      return res.status(400).json({
        message: "loadingEmptyWeight and loadingLoadedWeight are required",
      });
    }

    const builty = await Builty.findById(req.params.id);

    if (!builty) {
      return res.status(404).json({ message: "Builty not found" });
    }

    if (builty.status !== "Created") {
      return res.status(400).json({
        message: "Only created builty can be dispatched",
      });
    }

    builty.loadingEmptyWeight = Number(loadingEmptyWeight);
    builty.loadingLoadedWeight = Number(loadingLoadedWeight);
    builty.loadingMaterialWeight =
      Number(loadingLoadedWeight) - Number(loadingEmptyWeight);

    builty.status = "Dispatched";

    await builty.save();

    return res.status(200).json({
      message: "Builty dispatched successfully",
      builty,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error updating loading weight",
      error: error.message,
    });
  }
};

exports.dispatchBuilty = async (req, res) => {
  try {
    if (!["superadmin", "user", "worker", "driver"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const {
      loadingEmptyWeight,
      loadingLoadedWeight,
      loadingMaterialWeight,
      advanceMode,
      advanceAmount,
      advanceDieselLiters,
    } = req.body;

    if (loadingEmptyWeight === undefined || loadingLoadedWeight === undefined) {
      return res.status(400).json({
        message: "loadingEmptyWeight and loadingLoadedWeight are required",
      });
    }

    const builty = await Builty.findById(req.params.id);

    if (!builty) {
      return res.status(404).json({ message: "Builty not found" });
    }

    if (builty.status !== "Created") {
      return res.status(400).json({
        message: "Only created builty can be dispatched",
      });
    }

    builty.loadingEmptyWeight = Number(loadingEmptyWeight);
    builty.loadingLoadedWeight = Number(loadingLoadedWeight);

    if (loadingMaterialWeight !== undefined) {
      builty.loadingMaterialWeight = Number(loadingMaterialWeight);
    }

    if (advanceMode !== undefined) {
      builty.advanceMode = advanceMode;
    }

    if (advanceAmount !== undefined) {
      builty.advanceAmount = Number(advanceAmount);
    }

    if (advanceDieselLiters !== undefined) {
      builty.advanceDieselLiters = Number(advanceDieselLiters);
    }

    builty.status = "Dispatched";

    await builty.save();

    return res.status(200).json({
      message: "Builty dispatched successfully",
      builty,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error dispatching builty",
      error: error.message,
    });
  }
};

exports.completeBuilty = async (req, res) => {
  try {
    if (!["superadmin", "user", "worker", "driver"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const {
      deliveryLoadedWeight,
      deliveryEmptyWeight,
      deliveryStatus,
      paymentCutAmount,
    } = req.body;

    if (deliveryLoadedWeight === undefined || deliveryEmptyWeight === undefined) {
      return res.status(400).json({
        message: "deliveryLoadedWeight and deliveryEmptyWeight are required",
      });
    }

    const builty = await Builty.findById(req.params.id);

    if (!builty) {
      return res.status(404).json({ message: "Builty not found" });
    }

    if (builty.status !== "Dispatched") {
      return res.status(400).json({
        message: "Only dispatched builty can be completed",
      });
    }

    const deliveryMaterialWeight =
      Number(deliveryLoadedWeight) - Number(deliveryEmptyWeight);

    const loadingMaterialWeight = Number(builty.loadingMaterialWeight || 0);

    const weightDifference = loadingMaterialWeight - deliveryMaterialWeight;

    const allowedDiscountWeight = Number(builty.discountWeight || 0);

    const isLessDelivered = weightDifference > allowedDiscountWeight;

    if (isLessDelivered && deliveryStatus !== "Less Delivered") {
      return res.status(400).json({
        message:
          "deliveryStatus must be Less Delivered because material delivered is less than allowed discount weight",
        loadingMaterialWeight,
        deliveryMaterialWeight,
        weightDifference,
        allowedDiscountWeight,
      });
    }

    builty.deliveryLoadedWeight = Number(deliveryLoadedWeight);
    builty.deliveryEmptyWeight = Number(deliveryEmptyWeight);
    builty.deliveryMaterialWeight = deliveryMaterialWeight;
    builty.weightDifference = weightDifference;

    builty.deliveryStatus = isLessDelivered ? "Less Delivered" : "Delivered";
    builty.paymentCutAmount = Number(paymentCutAmount || 0);
    builty.isLessDelivered = isLessDelivered;

    builty.status = "Completed";
    builty.completedAt = new Date();

    await builty.save();

    if (builty.vehicleId) {
      await VehicleMaster.findByIdAndUpdate(builty.vehicleId, {
        isAssigned: false,
      });
    }
    if (builty.driverId) {
      await Driver.findByIdAndUpdate(builty.driverId, {
        $set: {
          isAssigned: false,
          deviceId: null,
        },
      });
    }

    return res.status(200).json({
      message: "Builty completed successfully",
      builty,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error completing builty",
      error: error.message,
    });
  }
};

exports.cancelBuilty = async (req, res) => {
  try {
    if (!["superadmin", "user", "worker"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { cancelReason } = req.body;

    const builty = await Builty.findById(req.params.id);

    if (!builty) {
      return res.status(404).json({ message: "Builty not found" });
    }

    if (builty.status === "Completed") {
      return res.status(400).json({
        message: "Completed builty cannot be cancelled",
      });
    }

    builty.status = "Cancelled";
    builty.cancelReason = cancelReason;
    builty.cancelledAt = new Date();

    await builty.save();

    return res.status(200).json({
      message: "Builty cancelled successfully",
      builty,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error cancelling builty",
      error: error.message,
    });
  }
};

exports.getBuiltys = async (req, res) => {
  try {
    if (!["superadmin", "user", "worker", "driver"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const {
      page = 1,
      limit = 10,
      search,
      status,
      supervisorId,
      supervisorModel,
      startDate,
      endDate,

      consignerId,
      consigneeId,
      vehicleId,
      transporterId,
      commissionAgentId,
      driverId,
      workerId,
      createdBy,

      bookingMode,
      vehicleOwnership,
      advanceMode,
    } = req.query;

    const query = {};

    if (req.user.role === "user") {
      query.supervisorId = req.user.id;
    } else if (req.user.role === "worker") {
      query.supervisorId = req.user.supervisor;
    } else if (req.user.role === "driver") {
      query.driverId = req.user.id;
    }

    if (supervisorModel) query.supervisorModel = supervisorModel;
    if (status) query.status = status;

    if (consignerId) query.consignerId = consignerId;
    if (consigneeId) query.consigneeId = consigneeId;
    if (vehicleId) query.vehicleId = vehicleId;
    if (transporterId) query.transporterId = transporterId;
    if (commissionAgentId) query.commissionAgentId = commissionAgentId;
    if (driverId) query.driverId = driverId;
    if (workerId) query.workerId = workerId;
    if (createdBy) query.createdBy = createdBy;

    if (bookingMode) query.bookingMode = bookingMode;
    if (vehicleOwnership) query.vehicleOwnership = vehicleOwnership;
    if (advanceMode) query.advanceMode = advanceMode;

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
      };
    }

    if (search) {
      query.$or = [
        { tpNo: { $regex: search, $options: "i" } },
        { consignerName: { $regex: search, $options: "i" } },
        { consigneeName: { $regex: search, $options: "i" } },
        { vehicleNumber: { $regex: search, $options: "i" } },
        { destinationLocation: { $regex: search, $options: "i" } },
      ];
    }

    const builtys = await Builty.find(query)
      .populate("consignerId", "name contactNumber contactPerson")
      .populate("consigneeId", "name contactNumber contactPerson")
      .populate("vehicleId", "vehicleNumber categoryId make grossVehicleWeight")
      .populate("transporterId", "transporterName contactPerson contactNumber")
      .populate("commissionAgentId", "name contactNumber contactPerson")
      .populate("driverId", "name contactNumber")
      .populate("pickupLocationId", "locationName latitude longitude")
      .populate("destinationLocationId", "locationName latitude longitude")
      .populate("vendorId", "vendorName contactPerson contactNumber")
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    const total = await Builty.countDocuments(query);

    return res.status(200).json({
      message: "Builtys fetched successfully",
      total,
      page: Number(page),
      limit: Number(limit),
      builtys,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching builtys",
      error: error.message,
    });
  }
};

exports.getBuiltyById = async (req, res) => {
  try {
    const builty = await Builty.findById(req.params.id)
      .populate("vehicleId", "vehicleNumber categoryId make grossVehicleWeight")
      .populate("transporterId", "transporterName contactPerson contactNumber")
      .populate("commissionAgentId", "name contactNumber contactPerson")
      .populate("consignerId", "name contactNumber contactPerson")
      .populate("consigneeId", "name contactNumber contactPerson")
      .populate("driverId", "name contactNumber")
      .populate("pickupLocationId", "locationName latitude longitude")
      .populate("destinationLocationId", "locationName latitude longitude")
      .populate("vendorId", "vendorName contactPerson contactNumber")
      .lean();

    if (!builty) {
      return res.status(404).json({ message: "Builty not found" });
    }

    return res.status(200).json({
      message: "Builty fetched successfully",
      builty,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching builty",
      error: error.message,
    });
  }
};