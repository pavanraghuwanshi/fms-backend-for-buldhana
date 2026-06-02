const mongoose = require("mongoose");
const Builty = require("../model/builtyModel");
const BuiltyCounter = require("../model/builtyCounterModel");
const VehicleMaster = require("../model/maintenanceDevice.model");

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

    if (!payload.destinationLocation) {
      return res.status(400).json({ message: "destinationLocation is required" });
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

    if (!payload.products || payload.products.length === 0) {
      return res.status(400).json({ message: "products are required" });
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

exports.completeBuilty = async (req, res) => {
  try {
    if (!["superadmin", "user", "worker", "driver"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { deliveryLoadedWeight, deliveryEmptyWeight } = req.body;

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

    const weightDifference =
      loadingMaterialWeight - deliveryMaterialWeight;

    const allowedDiscountWeight = Number(builty.discountWeight || 0);

    if (weightDifference > allowedDiscountWeight) {
      return res.status(400).json({
        message: "Weight difference is greater than allowed discount weight",
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

    builty.status = "Completed";
    builty.completedAt = new Date();

    await builty.save();

    // await sendBuiltyWhatsapp(builty.consignerContactNumber, builty);
    // await sendBuiltyWhatsapp(builty.consigneeContactNumber, builty);

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
      startDate,
      endDate,
    } = req.query;

    const query = {};

    if (req.user.role === "user") {
      query.supervisorId = req.user.id;
    } else if (req.user.role === "worker") {
      query.supervisorId = req.user.supervisor;
    } else if (supervisorId) {
      query.supervisorId = supervisorId;
    }

    if (status) query.status = status;

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
    const builty = await Builty.findById(req.params.id).lean();

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