const Inspection = require("../model/inspectionModel");
const InspectionImage = require("../model/inspectionImageModel");
const Driver = require("../model/driverModel");
const Trip = require("../model/tripModel");
const Device = require("../model/deviceModel");
const { compressImage } = require("../utils/helperFunctions"); // assumed utility

exports.addInspection = async (req, res) => {
  try {
    const { vehicleId } = req.query;
    if (!["user", "superadmin", "driver"].includes(req.user.role))
      return res.status(401).json({ message: "Unauthorized Access" });

    const driver = await Driver.findOne({ deviceId: vehicleId });
    if (!driver)
      return res.status(404).json({ error: "No driver assigned to this vehicle" });

    const trip = await Trip.findOne({ vehicleId, status: "in-progress" });
    if (!trip)
      return res.status(404).json({ error: "No in-progress trip found for this vehicle" });

    const uploadImage = async (fieldKey) => {
      const file = req.files?.[fieldKey]?.[0];
      if (!file) return null;

      const { base64Data, contentType } = await compressImage(file);
      const imgDoc = new InspectionImage({ base64Data, contentType });
      await imgDoc.save();
      return imgDoc._id;
    };

    const inspectionFields = [
      "engineOil",
      "acCollent",
      "sparkPlug",
      "airFilter",
      "breakFluid",
      "transmissionFluid",
      "powerStairingFluid",
      "windShieldWasherFluid",
      "tyrePressure",
      "tyreAlignment",
      "batteryCharge",
      "wiperBlades",
      "suspensionAndStairing",
      "underbody",
      "exaustSystem",
      "warningLights",
      "headLights",
      "indicator",
    ];

    const inspectionData = {
      vehicleId,
      DriverId: driver._id,
      tripId: trip._id,
    };

    for (const field of inspectionFields) {
      const fieldData = JSON.parse(req.body?.[field] || "{}");

      if (fieldData.status === false) {
        const imageId = await uploadImage(`${field}Img`);
        inspectionData[field] = { ...fieldData, Image: imageId };
      } else {
        inspectionData[field] = fieldData;
      }
    }

    const inspection = new Inspection(inspectionData);
    await inspection.save();

    return res.status(201).json({
      message: "Inspection created successfully",
      inspection,
    });
  } catch (error) {
    console.error("Inspection error:", error.message);
    return res.status(500).json({
      error: "Server error",
      details: error.message,
    });
  }
};

exports.getAllInspections = async (req, res) => {
  try {
    const allowedRoles = ['superadmin', 'user', 'driver'];
    if (!allowedRoles.includes(req.user.role)) return res.status(403).json({ message: "Unauthorized Access" });

    let filter = {};
    if (req.user.role === "superadmin") {
      const { supervisorId } = req.query;
      if (supervisorId) {
        const drivers = await Driver.find({ supervisor: supervisorId }).select('_id').lean();
        const driverIds = drivers.map(driver => driver._id);
        if (driverIds.length === 0) return res.status(404).json({ message: "No drivers found for this supervisor" });
        filter.DriverId = { $in: driverIds };
      }

    } else if (req.user.role === "user") {
      const drivers = await Driver.find({ supervisor: req.user.id }).select('_id').lean();
      const driverIds = drivers.map(driver => driver._id);
      if (driverIds.length === 0) return res.status(404).json({ message: "No drivers assigned to this user" });
      filter.DriverId = { $in: driverIds };
    } else if (req.user.role === "driver") {
      filter.DriverId = req.user.id;
    }

    const inspections = await Inspection.find(filter)
      .populate("DriverId", "name supervisor")
      .populate("tripId", "startLocation endLocation status")
      .sort({ createdAt: -1 })
      .lean();

    if (!inspections.length) return res.status(404).json({ message: "No inspections found" });

    // Collect all unique vehicle IDs
    const vehicleIds = inspections.map(i => i.vehicleId?.toString()).filter(Boolean);
    const uniqueVehicleIds = [...new Set(vehicleIds)];

    // Fetch vehicle names from the Device model in the main DB
    const vehicles = await Device.find({ _id: { $in: uniqueVehicleIds } })
      .select(" name uniqueId category")
      .lean();

    const vehicleMap = {};
    vehicles.forEach(v => {
      vehicleMap[v._id.toString()] = {
        name: v.name,
        category: v.category
      };
    });

    // Append vehicle data manually
    const enrichedInspections = inspections.map(ins => ({
      ...ins,
      vehicleDetails: vehicleMap[ins.vehicleId?.toString()] || null
    }));

    return res.status(200).json({ success: true, data: enrichedInspections });
  } catch (error) {
    console.error("Get inspections error:", error);
    return res.status(500).json({ error: "Server error", details: error.message });
  }
};

exports.getInspectionByDriverId = async (req, res) => {
  try {
    const role = req.user.role
    if (!['superadmin', 'user', 'driver'].includes(role)) return res.status(403).json({ message: "Unauthorized Access" });

    let filter = {};
    if (role === "driver") {
      filter.DriverId = req.user.id;
    }
    else {
      const { driverId } = req.query;
      if (!driverId) return res.status(400).json({ message: "driverId is required" });
      filter.DriverId = driverId;
    }

    const inspections = await Inspection.find(filter).populate("DriverId", "name").populate("tripId", "startLocation endLocation status vehicleName").sort({ createdAt: -1 }).lean();
    if (!inspections.length) return res.status(404).json({ message: "No inspections found for this vehicle" });

    return res.status(200).json({ success: true, data: inspections });
  } catch (error) {
    console.error("Get inspections by vehicle error:", error);
    return res.status(500).json({ error: "Server error", details: error.message });
  }
};

exports.getInspectionByVehicleId = async (req, res) => {
  try {
    const allowedRoles = ['superadmin', 'user', 'driver'];
    if (!allowedRoles.includes(req.user.role)) return res.status(403).json({ message: "Unauthorized Access" });
    const { vehicleId } = req.params;
    if (!vehicleId) return res.status(400).json({ message: "vehicleId parameter is required" });

    let filter = { vehicleId: vehicleId };
    if (req.user.role === "superadmin") {
      const { supervisorId } = req.query;
      if (supervisorId) {
        const drivers = await Driver.find({ supervisor: supervisorId }).select('_id').lean();
        const driverIds = drivers.map(driver => driver._id);
        if (driverIds.length === 0) return res.status(404).json({ message: "No drivers found for this supervisor" });
        filter.DriverId = { $in: driverIds };
      }
    } else if (req.user.role === "user") {
      const drivers = await Driver.find({ supervisor: req.user.id }).select('_id').lean();
      const driverIds = drivers.map(driver => driver._id);
      if (driverIds.length === 0) return res.status(404).json({ message: "No drivers assigned to this user" });

      filter.DriverId = { $in: driverIds };
    } else if (req.user.role === "driver") {
      filter.DriverId = req.user.id;
    }

    const inspections = await Inspection.find(filter)
      .populate("DriverId", "name")
      .populate("tripId", "startLocation endLocation status")
      .sort({ createdAt: -1 })
      .lean();

    if (!inspections.length) return res.status(404).json({ message: "No inspections found for this vehicle" });

    // Fetch the vehicle details
    const vehicle = await Device.findById(vehicleId).select("name uniqueId").lean();
    const enrichedInspections = inspections.map(ins => ({
      ...ins,
      vehicleDetails: vehicle ? { name: vehicle.name } : null
    }));

    return res.status(200).json({ success: true, data: enrichedInspections });
  } catch (error) {
    console.error("Get inspections by vehicle error:", error);
    return res.status(500).json({ error: "Server error", details: error.message });
  }
};

exports.editInspection = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "Inspection ID is required in params" });
    if (!['user', 'superadmin', 'driver'].includes(req.user.role)) return res.status(401).json({ message: "Unauthorized Access" });
    const inspection = await Inspection.findById(id);
    if (!inspection) return res.status(404).json({ message: "Inspection not found" });

    if (req.user.role === "user") {
      const drivers = await Driver.find({ supervisor: req.user.id }).select("_id").lean();
      const driverIds = drivers.map(d => d._id.toString());
      if (!driverIds.includes(inspection.DriverId.toString())) return res.status(403).json({ message: "You cannot edit this inspection" });
    } else if (req.user.role === "driver") {
      if (inspection.DriverId.toString() !== req.user.id) return res.status(403).json({ message: "You cannot edit this inspection" });
    }

    const uploadImage = async (fieldKey) => {
      const file = req.files?.[fieldKey]?.[0];
      if (!file) return null;

      const { base64Data, contentType } = await compressImage(file);
      const imgDoc = new InspectionImage({ base64Data, contentType });
      await imgDoc.save();
      return imgDoc._id;
    };

    const inspectionFields = [
      "engineOil", "acCollent", "sparkPlug", "airFilter", "breakFluid",
      "transmissionFluid", "powerStairingFluid", "windShieldWasherFluid",
      "tyrePressure", "tyreAlignment", "batteryCharge", "wiperBlades",
      "suspensionAndStairing", "underbody", "exaustSystem",
      "warningLights", "headLights", "indicator"
    ];

    for (const field of inspectionFields) {
      if (req.body[field]) {
        const fieldData = JSON.parse(req.body[field]);

        if (fieldData.status === false) {
          const imageId = await uploadImage(`${field}Img`);
          inspection[field] = { ...fieldData, Image: imageId };
        } else {
          inspection[field] = fieldData;
        }
      }
    }

    await inspection.save();
    return res.status(200).json({ message: "Inspection updated successfully", inspection });
  } catch (error) {
    console.error("Edit inspection error:", error.message);
    return res.status(500).json({ error: "Server error", details: error.message });
  }
};

exports.deleteInspection = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "Inspection ID is required in params" });
    if (!['superadmin', 'user', 'driver'].includes(req.user.role)) return res.status(401).json({ message: "Unauthorized Access" });
    const inspection = await Inspection.findById(id);
    if (!inspection) return res.status(404).json({ message: "Inspection not found" });

    // Role-based permission check
    if (req.user.role === "user") {
      const drivers = await Driver.find({ supervisor: req.user.id }).select("_id").lean();
      const driverIds = drivers.map(d => d._id.toString());
      if (!driverIds.includes(inspection.DriverId.toString())) return res.status(403).json({ message: "You cannot delete this inspection" });
    } else if (req.user.role === "driver") {
      if (inspection.DriverId.toString() !== req.user.id) return res.status(403).json({ message: "You cannot delete this inspection" });
    }

    // Optional: Delete associated inspection images
    const allImageFields = [
      "engineOil", "acCollent", "sparkPlug", "airFilter", "breakFluid",
      "transmissionFluid", "powerStairingFluid", "windShieldWasherFluid",
      "tyrePressure", "tyreAlignment", "batteryCharge", "wiperBlades",
      "suspensionAndStairing", "underbody", "exaustSystem",
      "warningLights", "headLights", "indicator"
    ];

    const imageIdsToDelete = [];
    for (const field of allImageFields) {
      const imageId = inspection[field]?.Image;
      if (imageId) imageIdsToDelete.push(imageId);
    }

    if (imageIdsToDelete.length) await InspectionImage.deleteMany({ _id: { $in: imageIdsToDelete } });
    await inspection.deleteOne();
    return res.status(200).json({ message: "Inspection deleted successfully" });
  } catch (error) {
    console.error("Delete inspection error:", error.message);
    return res.status(500).json({ error: "Server error", details: error.message });
  }
};

exports.getInspectionImageById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "Image ID is required in params" });
    const image = await InspectionImage.findById(id);
    if (!image) return res.status(404).json({ message: "Image not found" });
    return res.status(200).json({ success: true, contentType: image.contentType, base64Data: image.base64Data });
  } catch (error) {
    console.error("Get image error:", error.message);
    return res.status(500).json({ error: "Server error", details: error.message });
  }
};
