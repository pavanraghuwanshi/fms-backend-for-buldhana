const ServiceOdometer = require("../model/serviceOdometerModel");
const Service = require("../model/serviceModel");
const Device = require("../model/deviceModel");
const Driver = require("../model/driverModel");
const Trip = require("../model/tripModel");
const Vehicleexpense = require("../model/vehicleExpensesModel");
const { compressImage } = require("../utils/helperFunctions");
const ServiceImage = require("../model/serviceImageModel");
const VehicleExpenseImage = require("../model/vehicleExpenseImageModel");
const DailyVehicleDistanceCache = require("../model/dailyVehicleDistanceCacheModel");
const { default: mongoose } = require("mongoose");



// exports.setData = async (req, res) => {
//   try {
//     const allowedRoles = ["superadmin", "user", "driver"];
//     if (!req.user?.role || !allowedRoles.includes(req.user.role)) {
//       return res.status(403).json({ message: "Unauthorized Access" });
//     }

//     const {
//       date,
//       serviceType,
//       description,
//       amount,
//       paymentMode,
//       nextService,
//       location,
//       vendor,
//       lat,
//       long
//     } = req.body;

//     const { vehicleId } = req.query;

//     if (!vehicleId) {
//       return res.status(400).json({ message: "Vehicle ID is required" });
//     }

//     if (!date || !serviceType || !description || !amount || !paymentMode || !nextService) {
//       return res.status(400).json({ message: "Missing required fields" });
//     }

//     if (isNaN(amount) || amount < 0) {
//       return res.status(400).json({ message: "Invalid amount" });
//     }

//     const vehicle = await Device.findById(vehicleId).select("name user");
//     if (!vehicle) {
//       return res.status(404).json({ message: "Vehicle not found" });
//     }

//     const driver = await Driver.findOne({ currentVehicle: vehicleId }).select("name currentTripId");
//     if (!driver) {
//       return res.status(404).json({ message: "No driver assigned to this vehicle" });
//     }

//     const trip = await Trip.findById(driver.currentTripId);
//     if (!trip) {
//       return res.status(404).json({ message: "No active trip assigned to this driver" });
//     }
//     const serviceImg = req.files?.["serviceImg"]?.[0];
//     let serviceImgId = null;

//     if (serviceImg) {
//       const { base64Data, contentType } = await compressImage(serviceImg);
//       const imgDoc = new VehicleExpenseImage({ base64Data, contentType });
//       await imgDoc.save();
//       serviceImgId = imgDoc._id;
//     }

//     // Handle odometer data
//     let odometerData = await ServiceOdometer.findOne({ vehicleId });
//     if (!odometerData) {
//       odometerData = new ServiceOdometer({
//         vehicleId,
//         currentOdometer: 0,
//         lastService: 0,
//         nextServiceDue: nextService
//       });
//       await odometerData.save();
//     } else {
//       odometerData.nextServiceDue = nextService;
//       odometerData.lastService = odometerData.currentOdometer;
//       await odometerData.save();
//     }

//     const newExpense = new Vehicleexpense({
//       driverId: driver._id,
//       vehicleId,
//       vehicleName: vehicle.name,
//       amount: parseFloat(amount),
//       expenseType: serviceType,
//       date: new Date(date),
//       description,
//       paymentMode,
//       vendor: vendor,
//       billImg: serviceImgId,
//       location: location,
//       lat: lat && lat,
//       long: long && long
//     });

//     await newExpense.save();
//     // Create new service with embedded lastService and nextServiceDue
//     const newService = new Service({
//       vehicleId,
//       vehicleName: vehicle.name,
//       driverId: driver._id,
//       trip: trip._id,
//       date: new Date(date),
//       serviceType,
//       serviceImg: serviceImgId,
//       expenseId: newExpense._id,
//       description,
//       amount: parseFloat(amount),
//       paymentMode,
//       location: location,
//       lastService: odometerData.lastService,
//       nextServiceDue: nextService,
//       vendor: vendor,
//       lat: lat && lat,
//       long: long && long
//     });

//     await newService.save();

//     // Update odometer with reference to serviceId
//     odometerData.serviceId = newService._id;
//     await odometerData.save();

//     const returnResponse = {
//       serviceData: newService,
//       odometerData,
//       expenseData: newExpense,
//       imageData: serviceImgId ? await ServiceImage.findById(serviceImgId) : null
//     };

//     return res.status(201).json({
//       message: "Service, expense, and image data recorded successfully",
//       data: returnResponse
//     });

//   } catch (error) {
//     console.error("Error in setData:", error);
//     return res.status(500).json({
//       message: "Internal Server Error",
//       error: error.message || "An error occurred"
//     });
//   }
// };



exports.setData = async (req, res) => {
  try {
    const allowedRoles = ["superadmin", "user", "driver"];
    if (!req.user?.role || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Unauthorized Access" });
    }

    const {
      date,
      serviceType,
      description,
      amount,
      paymentMode,
      nextService,
      location,
      vendor,
      lat,
      long,
    } = req.body;

    const { vehicleId } = req.query;

    if (!vehicleId) {
      return res.status(400).json({ message: "Vehicle ID is required" });
    }

    if (!date || !serviceType || !description || !amount || !paymentMode || !nextService) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (isNaN(amount) || Number(amount) < 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    if (isNaN(nextService) || Number(nextService) <= 0) {
      return res.status(400).json({ message: "Invalid next service km" });
    }

    const vehicle = await Device.findById(vehicleId).select("name user uniqueId");
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    const vehicleObjId = new mongoose.Types.ObjectId(vehicleId);

    const driver = await Driver.findOne({ currentVehicle: vehicleObjId }).select("name currentTripId");
    if (!driver) {
      return res.status(404).json({ message: "No driver assigned to this vehicle" });
    }

    const trip = await Trip.findById(driver.currentTripId);
    if (!trip) {
      return res.status(404).json({ message: "No active trip assigned to this driver" });
    }

    const serviceImg = req.files?.["serviceImg"]?.[0];
    let serviceImgId = null;

    if (serviceImg) {
      const { base64Data, contentType } = await compressImage(serviceImg);
      const imgDoc = new VehicleExpenseImage({ base64Data, contentType });
      await imgDoc.save();
      serviceImgId = imgDoc._id;
    }

    // ✅ Current vehicle KM from distance cache
    let currentVehicleKm = 0;

    if (vehicle.uniqueId) {
      const distanceCache = await DailyVehicleDistanceCache.findOne({
        uniqueId: String(vehicle.uniqueId),
      })
        .sort({ createdAt: -1 })
        .lean();

      currentVehicleKm = Number(
        distanceCache?.totalKm ||
        distanceCache?.totalDistance ||
        distanceCache?.distance ||
        0
      );
    }

    const nextServiceDueKm = currentVehicleKm + Number(nextService);

    // ✅ Handle odometer data
    let odometerData = await ServiceOdometer.findOne({ vehicleId });

    if (!odometerData) {
      odometerData = new ServiceOdometer({
        vehicleId,
        currentOdometer: currentVehicleKm,
        lastService: currentVehicleKm,
        nextServiceDue: nextServiceDueKm,
      });
    } else {
      odometerData.currentOdometer = currentVehicleKm;
      odometerData.lastService = currentVehicleKm;
      odometerData.nextServiceDue = nextServiceDueKm;
    }

    await odometerData.save();

    const newExpense = new Vehicleexpense({
      driverId: driver._id,
      vehicleId,
      vehicleName: vehicle.name,
      amount: parseFloat(amount),
      expenseType: serviceType,
      date: new Date(date),
      description,
      paymentMode,
      vendor,
      billImg: serviceImgId,
      location,
      lat: lat || undefined,
      long: long || undefined,
    });

    await newExpense.save();

    const newService = new Service({
      vehicleId,
      vehicleName: vehicle.name,
      driverId: driver._id,
      trip: trip._id,
      date: new Date(date),
      serviceType,
      serviceImg: serviceImgId,
      expenseId: newExpense._id,
      description,
      amount: parseFloat(amount),
      paymentMode,
      location,
      lastService: currentVehicleKm,
      nextServiceDue: nextServiceDueKm,
      vendor,
      lat: lat || undefined,
      long: long || undefined,
    });

    await newService.save();

    odometerData.serviceId = newService._id;
    await odometerData.save();

    const returnResponse = {
      serviceData: newService,
      odometerData,
      expenseData: newExpense,
      imageData: serviceImgId ? await VehicleExpenseImage.findById(serviceImgId) : null,
    };

    return res.status(201).json({
      message: "Service, expense, and image data recorded successfully",
      data: returnResponse,
    });

  } catch (error) {
    console.error("Error in setData:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message || "An error occurred",
    });
  }
};


exports.editService = async (req, res) => {
  try {
    const allowedRoles = ["superadmin", "user", "driver"];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Unauthorized Access." });
    }

    const { serviceId } = req.params;
    const {
      odometer,
      date,
      serviceType,
      description,
      amount,
      paymentMode,
      nextService,
      vendor,
      lat,
      long,
    } = req.body;

    if (!serviceId) {
      return res.status(400).json({ message: "Service ID not provided." });
    }

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ message: "Service not found." });
    }

    // Update basic fields
    if (date) service.date = date;
    if (serviceType) service.serviceType = serviceType;
    if (description) service.description = description;
    if (amount) service.amount = amount;
    if (paymentMode) service.paymentMode = paymentMode;
    if (nextService) service.nextService = nextService;
    if (vendor) service.vendor = vendor;
    if (lat) service.lat = lat;
    if (long) service.long = long;
    await service.save();

    // Update odometer entry
    let odometerEntry = await ServiceOdometer.findOne({ serviceId: serviceId });
    if (!odometerEntry) {
      return res.status(404).json({ message: "No odometer found for this service, please create a new Service" });
    }

    if (nextService) odometerEntry.nextServiceDue = nextService;
    if (odometer) odometerEntry.currentOdometer = odometer;
    await odometerEntry.save();

    // Update vehicle expense
    const vehicleExpense = await Vehicleexpense.findById(service.expenseId);
    if (!vehicleExpense) {
      return res.status(404).json({ message: "Vehicle expense not found." });
    }

    if (date) vehicleExpense.date = date;
    if (serviceType) vehicleExpense.expenseType = serviceType;
    if (description) vehicleExpense.description = description;
    if (amount) vehicleExpense.amount = amount;
    if (paymentMode) vehicleExpense.paymentMode = paymentMode;
    if (lat) vehicleExpense.lat = lat;
    if (long) vehicleExpense.long = long;
    if (vendor) vehicleExpense.vendor = vendor;

    // --- Handle image update ---
    const billImg = req.files?.["billImg"]?.[0];
    if (billImg) {
      const { base64Data, contentType } = await compressImage(billImg);

      const billImgId = vehicleExpense.billImg;
      if (billImgId) {
        // Update existing image
        await VehicleExpenseImage.findByIdAndUpdate(billImgId, { base64Data, contentType });
      } else {
        // No existing image, create new and update reference
        const newImage = new VehicleExpenseImage({ base64Data, contentType });
        const savedImg = await newImage.save();
        vehicleExpense.billImg = savedImg._id;
      }
    }

    await vehicleExpense.save();

    return res.status(200).json({
      message: "Service updated successfully",
      data: service,
    });
  } catch (error) {
    console.error("Error editing service:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

exports.deleteService = async (req, res) => {
  try {
    const allowedRoles = ["superadmin", "user"];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Unauthorized Access." });
    }

    const { serviceId } = req.params;

    if (!serviceId) {
      return res.status(400).json({ message: "Service ID not provided." });
    }

    const service = await Service.findByIdAndDelete(serviceId);
    if (!service) {
      return res.status(404).json({ message: "Failed to delete service." });
    }
    await Vehicleexpense.findByIdAndDelete(service.expenseId);
    const deleteImage = await VehicleExpenseImage.findByIdAndDelete(service.serviceImg);
    if (!deleteImage) {
      return res.status(404).json({ message: "Failed to delete Image, may be image not found." });
    }
    return res.status(200).json({ message: "Service deleted successfully." });
  } catch (error) {
    console.error("Error deleting service:", error);
    return res.status(500).json({ message: "Internal Server Error" + error.message });
  }
};

exports.getOdometerByVehicleId = async (req, res) => {
  try {
    const allowedRoles = ["superadmin", "user", "driver"];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Unauthorized Access." });
    }

    const { vehicleId } = req.query;

    if (!vehicleId) {
      return res.status(400).json({ message: "Vehicle ID is required." });
    }

    // Fetch the single odometer entry for the vehicle
    const odometer = await ServiceOdometer.findOne({ vehicleId: vehicleId }).populate([
      { path: "driverId", select: "name" },
      { path: "trip", select: "startLocation endLocation status" }
    ]);
    console.log(odometer);

    if (!odometer) {
      return res.status(404).json({ message: "No odometer entry found for this vehicle." });
    }

    // Fetch all services for the vehicle
    const services = await Service.find({ vehicleId })
      .sort({ date: -1 })
      .populate("driverId", "name ")
      .populate("trip", "startLocation endLocation status");

    if (!services || services.length === 0) {
      return res.status(404).json({ message: "No service records found." });
    }

    return res.status(200).json({
      message: "Service history with odometer data fetched successfully",
      data: services,
      odometer: odometer
    });

  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Internal Server Error" + error.message });
  }
};

exports.getImageById = async (req, res) => {
  try {
    const allowedRoles = ["user", "superadmin", "driver"];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Unauthorized Access." });
    }
    const { id } = req.params;
    const image = await VehicleExpenseImage.findById(id);
    if (!image) {
      return res.status(404).json({ message: "Image not found." });
    }
    return res.status(200).json({ message: "image fetched successfully", data: image });
  } catch (error) {
    return res.status(500).json({ message: "something went wrong", error: error.message });
  }
};

exports.updateOdometer = async (req, res) => {
  try {
    const allowedRoles = ["superadmin"];
    if (!req.user?.role || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const { vehicleId } = req.params;
    const currentOdometer = req.body.currentOdometer;

    if (!vehicleId) {
      return res.status(400).json({ message: "Vehicle ID is required" });
    }
    console.log(currentOdometer);

    const odometerEntry = await ServiceOdometer.findOne({ vehicleId });

    if (!odometerEntry) {
      return res.status(404).json({ message: "Odometer entry not found for this vehicle" });
    }
    console.log(currentOdometer);


    odometerEntry.currentOdometer = currentOdometer;
    await odometerEntry.save();

    return res.status(200).json({
      message: "Odometer updated successfully",
      data: odometerEntry
    });
  } catch (error) {
    console.error("Error updating odometer:", error);
    return res.status(500).json({ message: "Internal Server Error" + error.message });
  }
};

exports.getAllServiceLogs = async (req, res) => {
  try {
    const { role, roleType, id, AssignedBranch = [] } = req.user;

    let deviceFilter = {};


    // ✅ ROLE HIERARCHY FILTER
    if (role === "superadmin" || roleType === "superadmin") {
      // superadmin → all vehicles
      if (req.query.userId) {
        deviceFilter.users = req.query.userId;
      }
    } else if (roleType === "school") {
      deviceFilter.schoolId = id;
    } else if (roleType === "branch") {
      deviceFilter.branchId = id;
    } else if (roleType === "branchGroup") {
      deviceFilter.branchId = { $in: AssignedBranch };
    } else if (role === "user" || role === "driver") {
      deviceFilter.users = id;
    } else {
      return res.status(403).json({ message: "Unauthorized role" });
    }

    // ✅ Find allowed vehicles first
    const vehicles = await Device.find(deviceFilter).select("_id");


    const vehicleIds = vehicles.map((v) => v._id);

    if (vehicleIds.length === 0) {
      return res.status(404).json({
        message: "No vehicles found",
      });
    }

    // ✅ Service logs only for allowed vehicles
    const services = await Service.find({
      vehicleId: { $in: vehicleIds },
    })
      .populate({
        path: "vehicleId",
        model: Device, // ✅ direct model pass karo
        select: "name category model schoolId branchId",
      })
      .populate({ path: "driverId", select: "name supervisor" })
      .populate({ path: "trip", select: "startLocation endLocation status" })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Service logs fetched successfully",
      total: services.length,
      data: services,
    });
  } catch (error) {
    console.error("Error fetching service logs:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message || "An error occurred",
    });
  }
};




exports.getVehicleStartOdoAndTotalKm = async (req, res) => {
  try {
    const allowedRoles = ["superadmin", "user", "driver"];

    if (!req.user?.role || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Unauthorized Access" });
    }

    const { vehicleId } = req.query;

    if (!vehicleId) {
      return res.status(400).json({ message: "Vehicle ID is required" });
    }

    const vehicle = await Device.findById(vehicleId).select("name uniqueId");

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    if (!vehicle.uniqueId) {
      return res.status(404).json({ message: "Vehicle uniqueId not found" });
    }

    const distanceCache = await DailyVehicleDistanceCache.findOne({
      uniqueId: String(vehicle.uniqueId),
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!distanceCache) {
      return res.status(404).json({
        message: "No distance cache found for this vehicle",
      });
    }

    return res.status(200).json({
      message: "Vehicle odometer data fetched successfully",
      data: {
        vehicleId: vehicle._id,
        vehicleName: vehicle.name,
        uniqueId: vehicle.uniqueId,
        startOdo: Number(distanceCache.startOdo || 0),
        totalKm: Number(distanceCache.totalKm || 0),
        cacheDate: distanceCache.createdAt,
      },
    });
  } catch (error) {
    console.error("Error fetching vehicle odometer data:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};


