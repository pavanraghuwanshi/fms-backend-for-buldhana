const Driver = require("../model/driverModel");
const VehicleMaster = require("../model/maintenanceDevice.model");
const BuiltyCounter = require("../model/builtyCounterModel");
const DailyBuilty = require("../model/dailyBuilty.model");
const mongoose = require("mongoose");
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const Trip = require("../model/tripModel");


const roleModelMap = {
  school: "School",
  branch: "Branch",
  branchGroup: "BranchGroup",
};

const getSupervisorModel = (req) => {
  return roleModelMap[req.user.roleType] || req.user.supervisorModel;
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
    payload.supervisorModel = getSupervisorModel(req);
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

  const filter = {
  };

  if (role === "driver") {
    filter.driverId = req.user.id;
  }

  if (role === "user") {
    filter.supervisorId = req.user.id;
    filter.supervisorModel = getSupervisorModel(req);
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

    const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

    if (req.user.role === "driver") {
      payload.driverId = req.user.id;

      if (!payload.supervisorId) {
        payload.supervisorId = req.user.supervisor;
      }

      if (!payload.supervisorModel) {
        payload.supervisorModel =
          req.user.supervisorModel ||
          req.user.supervisorType ||
          req.user.supervisorRole ||
          "School";
      }

      const driver = await Driver.findById(payload.driverId);

      if (!driver) {
        return res.status(404).json({ message: "Driver not found" });
      }

      if (!driver.deviceId) {
        return res.status(400).json({ message: "Vehicle is not assigned to this driver" });
      }

      const vehicle = await VehicleMaster.findById(driver.deviceId);

      if (!vehicle) {
        return res.status(400).json({ message: "Assigned vehicle not found" });
      }

      await VehicleMaster.findByIdAndUpdate(driver.deviceId, {
        isAssigned: true,
      });

      payload.vehicleId = vehicle._id;
      payload.vehicleNumber = vehicle.vehicleNumber;
      payload.vehicleName = vehicle.vehicleNumber || vehicle.name || vehicle.vehicleName;

      if (!payload.driverName) {
        payload.driverName = driver.name;
      }
    }

    if (req.user.role !== "driver") {
      if (!payload.driverId || !isValidObjectId(payload.driverId)) {
        return res.status(400).json({ message: "Valid driverId is required" });
      }

      if (!payload.vehicleId || !isValidObjectId(payload.vehicleId)) {
        return res.status(400).json({ message: "Valid vehicleId is required" });
      }

      const driver = await Driver.findById(payload.driverId);

      if (!driver) {
        return res.status(404).json({ message: "Driver not found" });
      }

      if (
        driver.deviceId &&
        String(driver.deviceId) !== String(payload.vehicleId)
      ) {
        await VehicleMaster.findByIdAndUpdate(driver.deviceId, {
          isAssigned: false,
        });
      }

      const vehicle = await VehicleMaster.findById(payload.vehicleId);

      if (!vehicle) {
        return res.status(400).json({ message: "Vehicle not found" });
      }

      await VehicleMaster.findByIdAndUpdate(payload.vehicleId, {
        isAssigned: true,
      });

      driver.deviceId = payload.vehicleId;
      await driver.save();

      if (!payload.driverName) {
        payload.driverName = driver.name;
      }

      if (!payload.vehicleNumber) {
        payload.vehicleNumber = vehicle.vehicleNumber;
      }

      payload.vehicleName =
        payload.vehicleName ||
        vehicle.vehicleNumber ||
        vehicle.name ||
        vehicle.vehicleName;
    }

    if (!payload.supervisorId) {
      return res.status(400).json({ message: "supervisorId is required" });
    }

    if (!payload.supervisorModel) {
      return res.status(400).json({ message: "supervisorModel is required" });
    }

    if (!payload.date) {
      return res.status(400).json({ message: "date is required" });
    }

    if (!payload.docNo) {
      return res.status(400).json({ message: "docNo is required" });
    }

    if (!payload.vehicleId || !isValidObjectId(payload.vehicleId)) {
      return res.status(400).json({ message: "Valid vehicleId is required" });
    }

    if (!payload.vehicleNumber) {
      return res.status(400).json({ message: "vehicleNumber is required" });
    }

    if (!payload.vehicleName) {
      return res.status(400).json({ message: "vehicleName is required" });
    }

    if (!payload.driverId || !isValidObjectId(payload.driverId)) {
      return res.status(400).json({ message: "Valid driverId is required" });
    }

    if (!payload.driverName) {
      return res.status(400).json({ message: "driverName is required" });
    }

    if (!payload.totalBags && payload.totalBags !== 0) {
      return res.status(400).json({ message: "totalBags is required" });
    }

    if (!payload.pickupLocation) {
      return res.status(400).json({ message: "pickupLocation is required" });
    }

    if (!payload.pickupLocationId || !isValidObjectId(payload.pickupLocationId)) {
      return res.status(400).json({ message: "Valid pickupLocationId is required" });
    }

    if (!payload.destinationLocation) {
      return res.status(400).json({ message: "destinationLocation is required" });
    }

    if (!payload.destinationLocationId || !isValidObjectId(payload.destinationLocationId)) {
      return res.status(400).json({ message: "Valid destinationLocationId is required" });
    }

    if (!payload.products || payload.products.length === 0) {
      return res.status(400).json({ message: "products are required" });
    }

    for (const item of payload.products) {
      if (!item.productId || !isValidObjectId(item.productId)) {
        return res.status(400).json({ message: "Valid productId is required" });
      }

      if (!item.productName) {
        return res.status(400).json({ message: "productName is required" });
      }

      if (!item.productWeight && item.productWeight !== 0) {
        return res.status(400).json({ message: "productWeight is required" });
      }

      if (!item.bags && item.bags !== 0) {
        return res.status(400).json({ message: "bags is required" });
      }
    }

    if (!payload.startOdometerReading && payload.startOdometerReading !== 0) {
      return res.status(400).json({ message: "startOdometerReading is required" });
    }

    if (!payload.zoneId || !isValidObjectId(payload.zoneId)) {
      return res.status(400).json({ message: "Valid zoneId is required" });
    }

    if (!payload.zoneName) {
      return res.status(400).json({ message: "zoneName is required" });
    }

    if (!payload.customerId || !isValidObjectId(payload.customerId)) {
      return res.status(400).json({ message: "Valid customerId is required" });
    }

    if (!payload.customerName) {
      return res.status(400).json({ message: "customerName is required" });
    }

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
    payload.vehicleNumber = payload.vehicleNumber.toUpperCase();
    payload.createdBy = req.user.id;
    payload.createdByRole = req.user.role;
    payload.status = "Created";

    const dailyBuilty = await DailyBuilty.create(payload);

    const trip = await Trip.create({
      driverId: dailyBuilty.driverId,
      vehicleId: dailyBuilty.vehicleId,
      vehicleName: dailyBuilty.vehicleName || dailyBuilty.vehicleNumber,
      supervisorId: dailyBuilty.supervisorId,
      builtyId: dailyBuilty._id,
      startLocation: dailyBuilty.pickupLocation,
      endLocation: dailyBuilty.destinationLocation,
      materialType: dailyBuilty.products
        .map((item) => item.productName)
        .join(", "),
      date: dailyBuilty.date,
      status: "in-progress",
      startOdometerReading: dailyBuilty.startOdometerReading,
      transportMode: "transport",
      clientName: dailyBuilty.customerName,
    });

    dailyBuilty.tripId = trip._id;
    await dailyBuilty.save();

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

const releaseDailyBuiltyAssignment = async (dailyBuilty) => {
  if (dailyBuilty.driverId) {
    await Driver.findByIdAndUpdate(dailyBuilty.driverId, {
      $set: {
        isAssigned: false,
        deviceId: null,
      },
    });
  }

  if (dailyBuilty.vehicleId) {
    await VehicleMaster.findByIdAndUpdate(dailyBuilty.vehicleId, {
      isAssigned: false,
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

    if (req.query.driverId) {
      if (!isValidObjectId(req.query.driverId)) {
        return res.status(400).json({ message: "Invalid driverId" });
      }
      filter.driverId = req.query.driverId;
    }

    if (req.query.vehicleId) {
      if (!isValidObjectId(req.query.vehicleId)) {
        return res.status(400).json({ message: "Invalid vehicleId" });
      }
      filter.vehicleId = req.query.vehicleId;
    }

    if (req.query.customerId) {
      if (!isValidObjectId(req.query.customerId)) {
        return res.status(400).json({ message: "Invalid customerId" });
      }
      filter.customerId = req.query.customerId;
    }

    if (req.query.zoneId) {
      if (!isValidObjectId(req.query.zoneId)) {
        return res.status(400).json({ message: "Invalid zoneId" });
      }
      filter.zoneId = req.query.zoneId;
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
        { docNo: { $regex: req.query.search, $options: "i" } },
        { vehicleNumber: { $regex: req.query.search, $options: "i" } },
        { vehicleName: { $regex: req.query.search, $options: "i" } },
        { driverName: { $regex: req.query.search, $options: "i" } },
        { pickupLocation: { $regex: req.query.search, $options: "i" } },
        { destinationLocation: { $regex: req.query.search, $options: "i" } },
        { zoneName: { $regex: req.query.search, $options: "i" } },
        { customerName: { $regex: req.query.search, $options: "i" } },
        { "products.productName": { $regex: req.query.search, $options: "i" } },
      ];
    }

    const [dailyBuilty, total] = await Promise.all([
      DailyBuilty.find(filter)
        .populate("driverId", "name contactNumber deviceId")
        .populate("vehicleId", "vehicleNumber make grossVehicleWeight")
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

    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid daily builty id" });
    }

    const filter = buildDailyBuiltyFilter(req);
    filter._id = req.params.id;

    const dailyBuilty = await DailyBuilty.findOne(filter)
      .populate("driverId", "name contactNumber deviceId")
      .populate("vehicleId", "vehicleNumber make grossVehicleWeight")
      .populate("pickupLocationId", "name")
      .populate("destinationLocationId", "name")

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

    const dailyBuilty = await DailyBuilty.findOne(filter);

    if (!dailyBuilty) {
      return res.status(404).json({
        message: "Daily builty not found or cannot update after completed/cancelled",
      });
    }

    const updateData = { ...req.body };

    if (updateData.vehicleId && !isValidObjectId(updateData.vehicleId)) {
      return res.status(400).json({ message: "Invalid vehicleId" });
    }

    if (updateData.driverId && !isValidObjectId(updateData.driverId)) {
      return res.status(400).json({ message: "Invalid driverId" });
    }

    if (updateData.pickupLocationId && !isValidObjectId(updateData.pickupLocationId)) {
      return res.status(400).json({ message: "Invalid pickupLocationId" });
    }

    if (updateData.destinationLocationId && !isValidObjectId(updateData.destinationLocationId)) {
      return res.status(400).json({ message: "Invalid destinationLocationId" });
    }

    if (updateData.zoneId && !isValidObjectId(updateData.zoneId)) {
      return res.status(400).json({ message: "Invalid zoneId" });
    }

    if (updateData.customerId && !isValidObjectId(updateData.customerId)) {
      return res.status(400).json({ message: "Invalid customerId" });
    }

    if (updateData.products && updateData.products.length > 0) {
      for (const item of updateData.products) {
        if (!item.productId || !isValidObjectId(item.productId)) {
          return res.status(400).json({ message: "Invalid productId" });
        }
      }
    }

    delete updateData.tpNo;
    delete updateData.supervisorId;
    delete updateData.supervisorModel;
    delete updateData.createdBy;
    delete updateData.createdByRole;
    delete updateData.status;
    delete updateData.tripId;

    if (req.user.role === "driver") {
      delete updateData.driverId;
      delete updateData.vehicleId;
      delete updateData.vehicleNumber;
      delete updateData.vehicleName;
      delete updateData.driverName;
    }

    if (req.user.role !== "driver") {
      const finalDriverId = updateData.driverId || dailyBuilty.driverId;
      const finalVehicleId = updateData.vehicleId || dailyBuilty.vehicleId;

      if (updateData.driverId || updateData.vehicleId) {
        const driver = await Driver.findById(finalDriverId);

        if (!driver) {
          return res.status(404).json({ message: "Driver not found" });
        }

        const vehicle = await VehicleMaster.findById(finalVehicleId);

        if (!vehicle) {
          return res.status(400).json({ message: "Vehicle not found" });
        }

        if (
          dailyBuilty.driverId &&
          String(dailyBuilty.driverId) !== String(finalDriverId)
        ) {
          await Driver.findByIdAndUpdate(dailyBuilty.driverId, {
            $set: {
              isAssigned: false,
              deviceId: null,
            },
          });
        }

        if (
          dailyBuilty.vehicleId &&
          String(dailyBuilty.vehicleId) !== String(finalVehicleId)
        ) {
          await VehicleMaster.findByIdAndUpdate(dailyBuilty.vehicleId, {
            isAssigned: false,
          });
        }

        await Driver.findByIdAndUpdate(finalDriverId, {
          $set: {
            isAssigned: true,
            deviceId: finalVehicleId,
          },
        });

        await VehicleMaster.findByIdAndUpdate(finalVehicleId, {
          isAssigned: true,
        });

        updateData.driverId = finalDriverId;
        updateData.vehicleId = finalVehicleId;
        updateData.driverName = updateData.driverName || driver.name;
        updateData.vehicleNumber = updateData.vehicleNumber || vehicle.vehicleNumber;
        updateData.vehicleName =
          updateData.vehicleName ||
          vehicle.vehicleNumber ||
          vehicle.name ||
          vehicle.vehicleName;
      }
    }

    if (updateData.vehicleNumber) {
      updateData.vehicleNumber = updateData.vehicleNumber.toUpperCase();
    }

    Object.assign(dailyBuilty, updateData);
    await dailyBuilty.save();

    if (dailyBuilty.tripId) {
      await Trip.findByIdAndUpdate(dailyBuilty.tripId, {
        driverId: dailyBuilty.driverId,
        vehicleId: dailyBuilty.vehicleId,
        vehicleName: dailyBuilty.vehicleName || dailyBuilty.vehicleNumber,
        supervisorId: dailyBuilty.supervisorId,
        startLocation: dailyBuilty.pickupLocation,
        endLocation: dailyBuilty.destinationLocation,
        materialType: dailyBuilty.products.map((item) => item.productName).join(", "),
        date: dailyBuilty.date,
        startOdometerReading: dailyBuilty.startOdometerReading,
        clientName: dailyBuilty.customerName,
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

    const { endOdometerReading } = req.body;

    if (endOdometerReading === undefined || endOdometerReading === "") {
      return res.status(400).json({ message: "endOdometerReading is required" });
    }

    const filter = buildDailyBuiltyFilter(req);
    filter._id = req.params.id;
    filter.status = "Created";

    const dailyBuilty = await DailyBuilty.findOne(filter);

    if (!dailyBuilty) {
      return res.status(404).json({
        message: "Daily builty not found or already completed/cancelled",
      });
    }

    dailyBuilty.endOdometerReading = Number(endOdometerReading);
    dailyBuilty.totalKm =
      Number(endOdometerReading) - Number(dailyBuilty.startOdometerReading || 0);

    dailyBuilty.status = "Completed";
    await dailyBuilty.save();

    await releaseDailyBuiltyAssignment(dailyBuilty);

    if (dailyBuilty.tripId) {
      await Trip.findByIdAndUpdate(dailyBuilty.tripId, {
        status: "completed",
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

    const dailyBuilty = await DailyBuilty.findOne(filter);

    if (!dailyBuilty) {
      return res.status(404).json({
        message: "Daily builty not found or already completed/cancelled",
      });
    }

    dailyBuilty.status = "Cancelled";
    dailyBuilty.cancelReason = req.body.cancelReason || "";
    await dailyBuilty.save();

    await releaseDailyBuiltyAssignment(dailyBuilty);

    if (dailyBuilty.tripId) {
      await Trip.findByIdAndUpdate(dailyBuilty.tripId, {
        status: "cancelled",
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

    const dailyBuilty = await DailyBuilty.findOne(filter);

    if (!dailyBuilty) {
      return res.status(404).json({ message: "Daily builty not found" });
    }

    await releaseDailyBuiltyAssignment(dailyBuilty);

    if (dailyBuilty.tripId) {
      await Trip.findByIdAndDelete(dailyBuilty.tripId);
    }

    await DailyBuilty.findByIdAndDelete(dailyBuilty._id);

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