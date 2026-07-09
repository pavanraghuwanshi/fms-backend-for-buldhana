const Driver = require("../model/driverModel.js");
const Device = require("../model/deviceModel.js");
const History = require("../model/credenceHistoryModel.js");
const DailyTripByDriver = require("../model/DailyTripByDriverModel.js");
const VehicleMaster = require("../model/maintenanceDevice.model");


exports.startDailyTrip = async (req, res) => {
  try {
    if (req.user.role !== "driver" && req.user.role !== "user") {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    let driverId;
    const { odometerStart } = req.body;

    if (req.user.role === "driver") {
      driverId = req.user.id;
      supervisorId = req.user.supervisor
    } else if (req.user.role === "user") {
      driverId = req.query.driverId;
      supervisorId = req.user.id
    }

    if (!driverId) {
      return res.status(400).json({ message: "Driver ID is required" });
    }

    if (!odometerStart && odometerStart !== 0) {
      return res.status(400).json({ success: false, message: "Start odometer reading is required" });
    }

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ success: false, message: "Driver not found" });
    }

    if (!driver.deviceId) {
      return res.status(400).json({ success: false, message: "Driver does not have a vehicle" });
    }

    const device = await VehicleMaster.findById(driver.deviceId).select("_id vehicleNumber");

    if (!device) {
      return res.status(404).json({ success: false, message: "Device not found" });
    }

    const existingTrip = await DailyTripByDriver.findOne({
      driverId,
      status: { $in: ["started"] },
    });

    if (existingTrip) {
      return res.status(400).json({
        success: false,
        message: "Driver already has an ongoing trip. Please complete it first.",
      });
    }
    const startTimeUTC = new Date();
    const startTimeIST = new Date(startTimeUTC.getTime() + 5.5 * 60 * 60 * 1000);

    const newTrip = await DailyTripByDriver.create({
      driverId,
      supervisorId,
      vehicleId: device._id, // Use device._id here
      odometerStart,
      startTime: startTimeIST
    });
    return res.status(201).json({
      success: true,
      message: "Daily trip started successfully",
      data: newTrip,
    });
  } catch (error) {
    console.error("Error starting daily trip:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};


exports.endDailyTrip = async (req, res) => {
  const { id } = req.params;
  try {
    if (req.user.role !== "driver" && req.user.role !== "user") {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    let driverId;
    const { odometerEnd } = req.body;

    if (req.user.role === "driver") {
      driverId = req.user.id;
    } else if (req.user.role === "user") {
      driverId = req.query.driverId;
    }

    if (!driverId) {
      return res.status(400).json({ success: false, message: "Driver ID is required" });
    }

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ success: false, message: "Driver not found" });
    }

    if (!driver.deviceId) {
      return res.status(400).json({ success: false, message: "Driver does not have a vehicle" });
    }

    const device = await VehicleMaster.findById(driver.deviceId).select("_id vehicleNumber");
    if (!device) {
      return res.status(404).json({ success: false, message: "Device not found" });
    }

    const trip = await DailyTripByDriver.findById(id);
    if (!trip) {
      return res.status(404).json({ success: false, message: "Trip not found" });
    }

    if (trip.status === "completed") {
      return res.status(400).json({ success: false, message: "This trip has already ended" });
    }

    const startTime = trip.startTime;
    const endTimeUTC = new Date();
    const endTimeIST = new Date(endTimeUTC.getTime() + 5.5 * 60 * 60 * 1000);

    const getGPSDistance = async (deviceId, startTime, endTimeIST) => {
      try {
        const query = {
          deviceId: deviceId,
          createdAt: { $gte: startTime, $lte: endTimeIST },
          "attributes.totalDistance": { $exists: true },
        };

        const [firstEntry, lastEntry] = await Promise.all([
          History.findOne(query).sort({ createdAt: 1 }).select("attributes.totalDistance").lean(),
          History.findOne(query).sort({ createdAt: -1 }).select("attributes.totalDistance").lean(),
        ]);

        const gpsKM = (
          ((lastEntry?.attributes?.totalDistance || 0) - (firstEntry?.attributes?.totalDistance || 0)) / 1000
        ).toFixed(2);

        return parseFloat(gpsKM);
      } catch (error) {
        console.error("Error calculating GPS distance:", error.message);
        return 0;
      }
    };

    const gpsKM = await getGPSDistance(device.deviceId, startTime, endTimeIST);

    trip.endTime = endTimeIST;
    trip.odometerEnd = odometerEnd;
    trip.gpsKM = gpsKM;
    trip.status = "completed"

    await trip.save();

    return res.status(200).json({
      success: true,
      message: "Trip ended successfully",
      data: trip,
    });
  } catch (error) {
    console.error("Error ending daily trip:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDailyTrips = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      startDate,
      endDate,
      search,
    } = req.query;

    let driverId;
    let supervisorId;

    const query = {};

    // Role-based driverId assignment
    if (req.user.role === "driver") {
      driverId = req.user.id;
    } else if (req.user.role === "user") {
      driverId = req.query.driverId;
      supervisorId = req.user.id
      if (supervisorId) query.supervisorId = supervisorId;
    } else {
      if (supervisorId) query.supervisorId = supervisorId;

    }

    if (driverId) query.driverId = driverId;

    if (status) query.status = status;

    // Date range filter
    if (startDate && endDate) {
      query.startTime = {
        $gte: new Date(startDate),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
      };
    } else if (startDate) {
      query.startTime = { $gte: new Date(startDate) };
    } else if (endDate) {
      query.startTime = { $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) };
    }

    // Text search (driver name or deviceId)
    if (search) {
      const drivers = await Driver.find({
        name: { $regex: search, $options: "i" },
      }).select("_id");

      const vehicles = await Device.find({
        $or: [
          { deviceId: { $regex: search, $options: "i" } },
          { name: { $regex: search, $options: "i" } },
          { uniqueId: { $regex: search, $options: "i" } },
        ],
      }).select("_id");

      query.$or = [
        { driverId: { $in: drivers.map((d) => d._id) } },
        { vehicleId: { $in: vehicles.map((v) => v._id) } },
      ];
    }

    const skip = (page - 1) * limit;

    // Fetch data with pagination
    const trips = await DailyTripByDriver.find(query)
      .populate("driverId", "name contactNumber currentVehicleName")
      // .populate("vehicleId","uniqueId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await DailyTripByDriver.countDocuments(query);

    return res.status(200).json({
      success: true,
      total,
      currentPage: Number(page),
      totalPages: Math.ceil(total / limit),
      data: trips,
    });
  } catch (error) {
    console.error("Error fetching daily trips:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

