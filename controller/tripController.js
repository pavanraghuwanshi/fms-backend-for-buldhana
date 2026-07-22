const Trip = require("../model/tripModel");
const Driver = require("../model/driverModel");
const Subtrip = require("../model/subTripModel");
const VehicleMaster = require("../model/maintenanceDevice.model");
const Builty = require("../model/builtyModel");
const WalletLedger = require("../model/WalletLedger");

exports.createTrip = async (req, res) => {
  try {
    if (req.user.role !== "user") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    const { loadingDate, unloadingDate, ...payload } = req.body;

    const crypto = require("crypto");
    const generatedTripId = `TRIP-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    const trip = new Trip({
      ...payload,
      tripId: generatedTripId,
      supervisorId: req.user.id,
    });

    if (loadingDate) {
      trip.loadingDate = loadingDate;
    }
    if (unloadingDate) {
      trip.unloadingDate = unloadingDate;
    }

    await trip.save();

    await Driver.findByIdAndUpdate(payload.driverId, {
      currentVehicle: payload.vehicleId,
      currentVehicleName: payload.vehicleName,
      currentTripId: trip._id,
      deviceId: payload.vehicleId
    });
    const initialDeposit = new WalletLedger({
      driverId: trip.driverId,
      supervisorId: trip.supervisorId,
      vehicleId: trip.vehicleId,
      type: "DEPOSIT",
      amount: trip.budgetAllocated || 0, // Positive for deposit
      balanceAfter: trip.budgetAllocated || 0, // First entry, so balance is the deposit
      tripId: trip._id,
      builtyId: trip.builtyId || null,
      actionBy: req.user.id,
      date: new Date()
    });
    await initialDeposit.save();
    return res.status(201).json(trip);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const buildTripQuery = async (user, queryParams) => {
  const { role, id: userId } = user;
  const {
    supervisorId,
    status,
    search,
    fromDate,
    toDate,
    vehicle,
    vehicleName,
    tpNo,
    docNo,
    driverName,
    uniqueTripId,
  } = queryParams;

  let query = {};

  if (role === "superadmin") {
    if (supervisorId) query.supervisorId = supervisorId;
  } else if (role === "user") {
    query.supervisorId = userId;
  } else if (role === "driver") {
    query.driverId = userId;
  } else {
    return null;
  }

  if (status) {
    query.status = status;
  }

  const filters = [];

  if (uniqueTripId) {
    filters.push({ tripId: { $regex: uniqueTripId, $options: "i" } });
  }

  if (fromDate || toDate) {
    const dateFilter = {};
    if (fromDate) dateFilter.$gte = new Date(fromDate);
    if (toDate) {
      const endOfDay = new Date(toDate);
      endOfDay.setHours(23, 59, 59, 999);
      dateFilter.$lte = endOfDay;
    }
    filters.push({
      $or: [
        { createdAt: dateFilter },
        { date: dateFilter }
      ]
    });
  }

  const vehName = vehicle || vehicleName;
  if (vehName) {
    filters.push({ vehicleName: { $regex: vehName, $options: "i" } });
  }

  if (driverName) {
    const drivers = await Driver.find({
      name: { $regex: driverName, $options: "i" },
    }).select("_id");
    const driverIds = drivers.map((d) => d._id);
    filters.push({ driverId: { $in: driverIds } });
  }

  if (tpNo || docNo) {
    const builtyQuery = {};
    if (tpNo) builtyQuery.tpNo = { $regex: tpNo, $options: "i" };
    if (docNo) builtyQuery.docNo = { $regex: docNo, $options: "i" };

    const builties = await Builty.find(builtyQuery).select("_id");
    const builtyIds = builties.map((b) => b._id);
    filters.push({ builtyId: { $in: builtyIds } });
  }

  if (search) {
    const drivers = await Driver.find({
      name: { $regex: search, $options: "i" },
    }).select("_id");
    const driverIds = drivers.map((d) => d._id);

    const builties = await Builty.find({
      $or: [
        { tpNo: { $regex: search, $options: "i" } },
        { docNo: { $regex: search, $options: "i" } },
      ],
    }).select("_id");
    const builtyIds = builties.map((b) => b._id);

    filters.push({
      $or: [
        { tripId: { $regex: search, $options: "i" } },
        { route: { $regex: search, $options: "i" } },
        { vehicleName: { $regex: search, $options: "i" } },
        { driverId: { $in: driverIds } },
        { builtyId: { $in: builtyIds } },
      ],
    });
  }

  if (filters.length > 0) {
    query.$and = filters;
  }

  return query;
};
exports.getAllTrips = async (req, res) => {
  try {
    const query = await buildTripQuery(req.user, req.query);

    if (!query) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }
    let trips = [];

    if (req.user.role === "superadmin") {
      trips = await Trip.find(query)
        .populate({
          path: "driverId",
          select: "name deviceId ",
          populate: {
            path: "deviceId",
            select: "vehicleNumber",
          },
        })
        .populate({
          path: "builtyId",
          select: "tpNo docNo consigneeName consignerName",
        })
        .sort({ createdAt: -1 });
    } else if (req.user.role === "user") {
      trips = await Trip.find(query)
        .populate({
          path: "driverId",
          select: "name deviceId",
          populate: {
            path: "deviceId",
            select: "vehicleNumber",
          },
        })
        .populate({
          path: "builtyId",
          select: "tpNo docNo consigneeName consignerName",
        })
        .sort({ createdAt: -1 });
    } else if (req.user.role === "driver") {
      trips = await Trip.find(query)
        .populate({
          path: "driverId",
          select: "name deviceId",
          populate: {
            path: "deviceId",
            select: "vehicleNumber",
          },
        })
        .sort({ createdAt: -1 });
    } else {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    const tripsWithBudget = await Promise.all(
      trips.map(async (trip) => {
        const subTrip = await Subtrip.findOne({ tripId: trip._id }).select(
          "budgetAllocated"
        );

        return {
          ...trip.toObject(),
          subTripBudgetAllocated: subTrip?.budgetAllocated || 0,
        };
      })
    );

    return res.status(200).json(tripsWithBudget);

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
exports.updateTrip = async (req, res) => {
  try {
    if (!["user", "driver"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    const tripId = req.params.tripId;

    if (req.body.status === "completed") {
      const subtrips = await Subtrip.find({ tripId }).select("status").lean();

      if (subtrips.some((subtrip) => subtrip.status === "in-progress")) {
        return res.status(400).json({
          success: false,
          message: "Cannot complete trip: One or more subtrips are in-progress",
        });
      }
    }

    if (req.user.role === "user") {
      const trip = await Trip.findOneAndUpdate(
        { _id: tripId, supervisorId: req.user.id },
        req.body,
        {
          new: true,
          runValidators: true,
        }
      );

      if (!trip) {
        return res.status(404).json({
          success: false,
          message: "Trip not found",
        });
      }

      if (trip.status === "cancelled") {
        // Delete all ledger entries related to this trip if cancelled
        await WalletLedger.deleteMany({ tripId: trip._id });
      } else {
        // Find and update the first DEPOSIT entry of this trip in the ledger
        const firstDepositEntry = await WalletLedger.findOne({ tripId: trip._id, type: "DEPOSIT" }).sort({ createdAt: 1 });
        if (firstDepositEntry) {
          firstDepositEntry.driverId = trip.driverId;
          firstDepositEntry.vehicleId = trip.vehicleId;
          firstDepositEntry.amount = trip.budgetAllocated || 0;
          firstDepositEntry.balanceAfter = trip.budgetAllocated || 0;
          firstDepositEntry.builtyId = trip.builtyId || null;
          firstDepositEntry.actionBy = req.user.id;
          await firstDepositEntry.save();
        } else {
          const initialDeposit = new WalletLedger({
            driverId: trip.driverId,
            supervisorId: req.user.id,
            vehicleId: trip.vehicleId,
            type: "DEPOSIT",
            amount: trip.budgetAllocated || 0,
            balanceAfter: trip.budgetAllocated || 0,
            tripId: trip._id,
            builtyId: trip.builtyId || null,
            actionBy: req.user.id,
            date: new Date()
          });
          await initialDeposit.save();
        }
      }

      if (req.body.vehicleId) {
        const vehicle = await VehicleMaster.findById(req.body.vehicleId).select(
          "vehicleNumber"
        );

        if (!vehicle) {
          return res.status(404).json({
            success: false,
            message: "Vehicle not found",
          });
        }

        await Driver.findByIdAndUpdate(trip.driverId, {
          currentVehicle: req.body.vehicleId,
          currentVehicleName: vehicle.vehicleNumber,
        });
      }

      if (req.body.driverId) {
        await Driver.findOneAndUpdate(
          { currentTripId: trip._id },
          {
            currentVehicle: null,
            currentVehicleName: null,
            currentTripId: null,
          }
        );

        const vehicle = req.body.vehicleId
          ? await VehicleMaster.findById(req.body.vehicleId).select(
            "vehicleNumber"
          )
          : null;

        await Driver.findByIdAndUpdate(req.body.driverId, {
          currentVehicle: req.body.vehicleId || null,
          currentVehicleName: vehicle ? vehicle.vehicleNumber : null,
          currentTripId: trip._id,
        });
      }

      if (trip.status === "completed") {
        await Driver.findByIdAndUpdate(trip.driverId, {
          currentVehicle: null,
          currentVehicleName: null,
          currentTripId: null,
        });
      }

      return res.status(200).json({
        success: true,
        message: "Trip updated successfully",
        trip,
      });
    }

    if (req.user.role === "driver") {
      const trip = await Trip.findById(tripId).select(
        "status driverId vehicleId driverCheckIn"
      );

      if (!trip) {
        return res.status(404).json({
          success: false,
          message: "Trip not found",
        });
      }

      if (String(trip.driverId) !== String(req.user.id)) {
        return res.status(403).json({
          success: false,
          message: "You are not assigned to this trip",
        });
      }

      if (trip.status !== "in-progress") {
        return res.status(400).json({
          success: false,
          message: `Trip is ${trip.status}, you can't change its status`,
        });
      }

      const updatedField = {};

      if (req.body.status === "completed") {
        updatedField.status = "completed";

        if (req.body.endOdometerReading === undefined) {
          return res.status(400).json({
            success: false,
            message: "endOdometerReading is required to complete trip",
          });
        }

        updatedField.endOdometerReading = Number(req.body.endOdometerReading);
      }

      if (req.body.unloadingDate !== undefined) {
        updatedField.unloadingDate = req.body.unloadingDate;
      }

      if (req.body.loadingDate !== undefined) {
        updatedField.loadingDate = req.body.loadingDate;
      }

      const updatedTrip = await Trip.findByIdAndUpdate(
        tripId,
        { $set: updatedField },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!updatedTrip) {
        return res.status(404).json({
          success: false,
          message: "Trip not found",
        });
      }

      if (updatedTrip.status === "completed") {
        await Driver.findByIdAndUpdate(trip.driverId, {
          currentVehicle: null,
          currentVehicleName: null,
          currentTripId: null,
        });
      }

      return res.status(200).json({
        success: true,
        message: "Trip status updated successfully",
        trip: updatedTrip,
      });
    }
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.completeTrip = async (req, res) => {
  try {
    if (!["user", "driver"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    const tripId = req.params.tripId;
    const { endOdometerReading, unloadingStartDate } = req.body;

    if (unloadingStartDate === undefined || unloadingStartDate === "") {
      return res.status(400).json({
        success: false,
        message: "unloadingStartDate is required to complete trip",
      });
    }

    if (unloadingEndDate === undefined || unloadingEndDate === "") {
      return res.status(400).json({
        success: false,
        message: "unloadingEndDate is required to complete trip",
      });
    }

    const tripCheck = await Trip.findById(tripId).select("status driverId supervisorId builtyId builtyIds");
    if (!tripCheck) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    if (tripCheck.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Trip is already completed",
      });
    }

    if (tripCheck.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Trip is cancelled and cannot be completed",
      });
    }

    // Check associated builties status
    const builtyIdsToCheck = [];
    if (tripCheck.builtyId) {
      builtyIdsToCheck.push(tripCheck.builtyId);
    }
    if (tripCheck.builtyIds && tripCheck.builtyIds.length > 0) {
      builtyIdsToCheck.push(...tripCheck.builtyIds);
    }

    const uniqueBuiltyIds = [...new Set(builtyIdsToCheck.map(id => id.toString()))];
    if (uniqueBuiltyIds.length > 0) {
      const activeBuilties = await Builty.find({
        _id: { $in: uniqueBuiltyIds },
        status: { $nin: ["Completed", "Cancelled"] }
      }).select("status tpNo").lean();

      if (activeBuilties.length > 0) {
        const uncompletedTpNos = activeBuilties.map(b => b.tpNo || b._id).join(", ");
        return res.status(400).json({
          success: false,
          message: `Cannot complete trip: One or more associated builties are not completed (${uncompletedTpNos})`,
        });
      }
    }

    const subtrips = await Subtrip.find({ tripId }).select("status").lean();
    if (subtrips.some((subtrip) => subtrip.status === "in-progress")) {
      return res.status(400).json({
        success: false,
        message: "Cannot complete trip: One or more subtrips are in-progress",
      });
    }

    let trip;

    if (req.user.role === "user") {
      trip = await Trip.findOneAndUpdate(
        { _id: tripId, supervisorId: req.user.id },
        {
          $set: {
            status: "completed",
            unloadingStartDate: new Date(unloadingStartDate),
            unloadingEndDate: new Date(unloadingEndDate),
            ...(endOdometerReading !== undefined && { endOdometerReading: Number(endOdometerReading) }),
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!trip) {
        return res.status(404).json({
          success: false,
          message: "Trip not found",
        });
      }

      await Driver.findByIdAndUpdate(trip.driverId, {
        currentVehicle: null,
        currentVehicleName: null,
        currentTripId: null,
      });

      return res.status(200).json({
        success: true,
        message: "Trip completed successfully",
        trip,
      });
    }

    if (req.user.role === "driver") {
      if (String(tripCheck.driverId) !== String(req.user.id)) {
        return res.status(403).json({
          success: false,
          message: "You are not assigned to this trip",
        });
      }

      if (endOdometerReading === undefined) {
        return res.status(400).json({
          success: false,
          message: "endOdometerReading is required to complete trip",
        });
      }

      const updatedTrip = await Trip.findByIdAndUpdate(
        tripId,
        {
          $set: {
            status: "completed",
            endOdometerReading: Number(endOdometerReading),
            unloadingStartDate: new Date(unloadingStartDate),
            unloadingEndDate: new Date(unloadingEndDate),
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!updatedTrip) {
        return res.status(404).json({
          success: false,
          message: "Trip not found",
        });
      }

      await Driver.findByIdAndUpdate(tripCheck.driverId, {
        currentVehicle: null,
        currentVehicleName: null,
        currentTripId: null,
      });

      return res.status(200).json({
        success: true,
        message: "Trip completed successfully",
        trip: updatedTrip,
      });
    }
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteTrip = async (req, res) => {
  try {
    if (req.user.role !== "user") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    const trip = await Trip.findOneAndDelete({
      _id: req.params.tripId,
      supervisorId: req.user.id,
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    // Delete all ledger entries related to this trip
    await WalletLedger.deleteMany({ tripId: trip._id });

    await Driver.findByIdAndUpdate(trip.driverId, {
      currentVehicle: null,
      currentVehicleName: null,
      currentTripId: null,
    });

    return res.status(200).json({
      success: true,
      message: "Trip deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getTripByVehicleId = async (req, res) => {
  try {
    const vehicleId = req.params.id;

    const trip = await Trip.find({ vehicleId })
      .populate("driverId", "-_id name")
      .select("-vehicleId -supervisorId -__v");

    if (!trip.length) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    return res.status(200).json(trip);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getTripByDriverId = async (req, res) => {
  try {
    const trips = await Trip.find({ driverId: req.params.id }).populate(
      "driverId",
      "name"
    ).sort({ createdAt: -1 });

    if (!trips.length) {
      return res.status(404).json({
        success: false,
        message: "No Trip found",
      });
    }

    return res.status(200).json(trips);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getTripAnalyticsByTripId = async (req, res) => {
  try {
    const [trips, subtrip] = await Promise.all([
      Trip.findById(req.params.id)
        .populate("driverId", "-_id name")
        .select("-__v -vehicleId -createdAt"),
      Subtrip.find({ tripId: req.params.id }).select("-__v -tripId"),
    ]);

    if (!trips) {
      return res.status(404).json({
        success: false,
        message: "No Trip found",
      });
    }

    return res.status(200).json({ trips, subtrip });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.tripCheckIn = async (req, res) => {
  try {
    if (req.user.role !== "driver") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    const { startOdometerReading } = req.body;

    if (startOdometerReading === undefined) {
      return res.status(400).json({
        success: false,
        message: "startOdometerReading is required",
      });
    }

    const driver = await Driver.findById(req.user.id).select(
      "currentTripId currentVehicle deviceId"
    );

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    if (!driver.currentTripId) {
      return res.status(400).json({
        success: false,
        message: "No trip assigned to this driver",
      });
    }

    if (!driver.deviceId) {
      console.log("Driver's current vehicle ID:", driver);
      return res.status(400).json({
        success: false,

        message: "No vehicle assigned to this driver",
      });
    }

    const trip = await Trip.findById(driver.currentTripId).select(
      "status driverCheckIn vehicleId driverId"
    );

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    if (String(trip.driverId) !== String(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned to this trip",
      });
    }

    if (trip.status !== "in-progress") {
      return res.status(400).json({
        success: false,
        message: `Trip is ${trip.status}, you can't check-in`,
      });
    }

    if (trip.driverCheckIn) {
      return res.status(400).json({
        success: false,
        message: "Driver already checked in for this trip",
      });
    }

    if (!trip.vehicleId) {
      return res.status(400).json({
        success: false,
        message: "No vehicle assigned to this trip",
      });
    }

    trip.driverCheckIn = true;
    trip.startOdometerReading = Number(startOdometerReading);

    await trip.save();

    return res.status(200).json({
      success: true,
      message: "Driver checked in successfully",
      startOdometerReading: trip.startOdometerReading,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getDutySlipByTripId = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id)
      .populate("driverId", "-_id name contactNumber")
      .populate("companyId")
      .select("-__v -createdAt -driverCheckIn -spentAmount")
      .lean();

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    if (trip.status !== "completed") {
      return res.status(400).json({
        success: false,
        message:
          "Trip is not completed yet. You can't generate slip until the trip is completed.",
      });
    }

    const mileage = await VehicleMaster.findById(trip.vehicleId)
      .select("average")
      .lean();

    if (mileage) trip.mileage = mileage.average;

    return res.status(200).json(trip);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


const getPaginatedTrips = async (finalQuery, queryParams, isDriver = false) => {
  let { page = 1, limit = 10 } = queryParams;

  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;

  const totalItems = await Trip.countDocuments(finalQuery);
  let queryBuilder = Trip.find(finalQuery)
    .populate({
      path: "driverId",
      select: "name deviceId ",
      populate: {
        path: "deviceId",
        select: "vehicleNumber",
      },
    });

  if (!isDriver) {
    queryBuilder = queryBuilder.populate({
      path: "builtyId",
      select: "tpNo docNo consigneeName consignerName",
    });
  }

  const trips = await queryBuilder
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const tripsWithBudget = await Promise.all(
    trips.map(async (trip) => {
      const subTrip = await Subtrip.findOne({ tripId: trip._id }).select(
        "budgetAllocated"
      );

      return {
        ...trip.toObject(),
        subTripBudgetAllocated: subTrip?.budgetAllocated || 0,
      };
    })
  );

  return {
    msg: "Warehouses fetched successfully",
    page,
    limit,
    totalItems,
    totalPages: Math.ceil(totalItems / limit),
    data: tripsWithBudget,
  };
};

exports.getAllTripswithPegination = async (req, res) => {
  try {
    const query = await buildTripQuery(req.user, req.query);

    if (!query) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    query.status = { $ne: "cancelled" };

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const totalItems = await Trip.countDocuments(query);


    let trips = [];

    if (req.user.role === "superadmin") {
      trips = await Trip.find(query)
        .populate({
          path: "driverId",
          select: "name deviceId ",
          populate: {
            path: "deviceId",
            select: "vehicleNumber",
          },
        })
        .populate({
          path: "builtyId",
          select: "tpNo docNo consigneeName consignerName",
        })
        .populate("builtyIds", "docNo tpNo")
        .sort({ createdAt: -1 })
        .skip(skip)   // Applied pagination
        .limit(limit); // Applied pagination
    } else if (req.user.role === "user") {
      trips = await Trip.find(query)
        .populate({
          path: "driverId",
          select: "name deviceId",
          populate: {
            path: "deviceId",
            select: "vehicleNumber",
          },
        })
        .populate({
          path: "builtyId",
          select: "tpNo docNo consigneeName consignerName",
        })
        .populate("builtyIds", "docNo tpNo")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
    } else if (req.user.role === "driver") {
      trips = await Trip.find(query)
        .populate({
          path: "driverId",
          select: "name deviceId",
          populate: {
            path: "deviceId",
            select: "vehicleNumber",
          },
        })
        .populate("builtyIds", "docNo tpNo")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
    } else {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    const tripsWithBudget = await Promise.all(
      trips.map(async (trip) => {
        const subTrip = await Subtrip.findOne({ tripId: trip._id }).select(
          "budgetAllocated"
        );

        const ledgerEntries = await WalletLedger.find({ tripId: trip._id }).lean();
        let deposite = 0;
        let withdraw = 0;
        for (const entry of ledgerEntries) {
          if (entry.type === "DEPOSIT") {
            deposite += entry.amount || 0;
          } else if (entry.type === "WITHDRAW") {
            withdraw += Math.abs(entry.amount || 0);
          }
        }
        const netBalance = deposite - withdraw;

        return {
          ...trip.toObject(),
          subTripBudgetAllocated: subTrip?.budgetAllocated || 0,
          deposite,
          withdraw,
          netBalance,
          docNo: trip.builtyIds?.[0]?.docNo || "N/A",
          tpNo: trip.builtyIds?.[0]?.tpNo || "N/A",
        };
      })
    );

    return res.status(200).json({
      msg: "Logs fetched successfully",
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      data: tripsWithBudget
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getInProgressTrips = async (req, res) => {
  try {
    const query = await buildTripQuery(req.user, req.query);
    if (!query) {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    query.status = "in-progress";
    query["builtyIds.0"] = { $exists: true };

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const [total, trips] = await Promise.all([
      Trip.countDocuments(query),
      Trip.find(query)
        .populate("driverId", "name") // Populates driver object to get .name and ._id
        .populate("builtyIds", "docNo tpNo")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    const formattedTrips = await Promise.all(
      trips.map(async (trip) => {
        const driverId = trip.driverId?._id || trip.driverId;
        const ledgerEntries = driverId ? await WalletLedger.find({ driverId }).lean() : [];
        let deposite = null;
        let withdraw = null;
        let netBalance = null;

        if (ledgerEntries.length > 0) {
          deposite = 0;
          withdraw = 0;
          for (const entry of ledgerEntries) {
            if (entry.type === "DEPOSIT") {
              deposite += entry.amount || 0;
            } else if (entry.type === "WITHDRAW") {
              withdraw += Math.abs(entry.amount || 0);
            }
          }
          netBalance = deposite - withdraw;
        }

        return {
          tripId: trip._id, // Renamed _id to tripId
          uniqueTripId: trip.tripId, // Added uniqueTripId
          driverId: trip.driverId?._id, // Included driverId
          driverName: trip.driverId?.name || "N/A", // Populated driver name
          vehicleName: trip.vehicleName,
          vehicleId: trip.vehicleId,
          startLocation: trip.startLocation, // Included startLocation
          endLocation: trip.endLocation,
          docNo: trip.builtyIds?.[0]?.docNo || "N/A",
          tpNo: trip.builtyIds?.[0]?.tpNo || "N/A",
          status: trip.status,
          date: trip.date,
          deposite,
          withdraw,
          netBalance
        };
      })
    );

    return res.status(200).json({
      message: "In-progress trips fetched successfully",
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      trips: formattedTrips,
    });
  } catch (error) {
    console.error("Error in getInProgressTrips:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred.",
    });
  }
};

exports.getTripsForDropdown = async (req, res) => {
  try {
    const query = await buildTripQuery(req.user, req.query);
    if (!query) {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    query.status = { $in: ["completed", "in-progress"] };

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const [total, trips] = await Promise.all([
      Trip.countDocuments(query),
      Trip.find(query)
        .populate("driverId", "name") // Populates driver object to get .name and ._id
        .populate("builtyIds", "docNo tpNo")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    const formattedTrips = trips.map((trip) => ({
      tripId: trip._id, // Renamed _id to tripId
      driverId: trip.driverId?._id, // Included driverId
      driverName: trip.driverId?.name || "N/A", // Populated driver name
      vehicleName: trip.vehicleName,
      vehicleId: trip.vehicleId,
      startLocation: trip.startLocation, // Included startLocation
      endLocation: trip.endLocation,
      docNo: trip.builtyIds?.[0]?.docNo || "N/A",
      tpNo: trip.builtyIds?.[0]?.tpNo || "N/A",
      status: trip.status,
      date: trip.date
    }));

    return res.status(200).json({
      message: "Trips fetched successfully",
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      trips: formattedTrips,
    });
  } catch (error) {
    console.error("Error in getTripsForDropdown:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred.",
    });
  }
};

exports.getDriverLedgerHistory = async (req, res) => {
  try {
    const { driverId } = req.params;
    const { page = 1, limit = 10, search, type } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skipNum = (pageNum - 1) * limitNum;

    const mongoose = require("mongoose");

    // 1. Calculate overall financial summary for this driver
    const summary = await WalletLedger.aggregate([
      { $match: { driverId: new mongoose.Types.ObjectId(driverId) } },
      {
        $group: {
          _id: "$driverId",
          totalDeposits: {
            $sum: { $cond: [{ $eq: ["$type", "DEPOSIT"] }, "$amount", 0] }
          },
          totalWithdrawals: {
            $sum: { $cond: [{ $eq: ["$type", "WITHDRAW"] }, { $abs: "$amount" }, 0] }
          }
        }
      }
    ]);

    const deposite = summary[0]?.totalDeposits || 0;
    const withdraw = summary[0]?.totalWithdrawals || 0;
    const netBalance = deposite - withdraw;

    // 2. Fetch Paginated Ledger Entries with populated details
    const matchQuery = { driverId: new mongoose.Types.ObjectId(driverId) };
    if (type) matchQuery.type = type;

    const pipeline = [
      { $match: matchQuery },
      
      // Join Driver
      { $lookup: { from: "drivers", localField: "driverId", foreignField: "_id", as: "driver" } },
      { $unwind: { path: "$driver", preserveNullAndEmptyArrays: true } },
      
      // Join VehicleMaster
      { $lookup: { from: "vehiclemasters", localField: "vehicleId", foreignField: "_id", as: "vehicle" } },
      { $unwind: { path: "$vehicle", preserveNullAndEmptyArrays: true } },
      
      // Join Trip
      { $lookup: { from: "trips", localField: "tripId", foreignField: "_id", as: "trip" } },
      { $unwind: { path: "$trip", preserveNullAndEmptyArrays: true } },
      
      // Join Builty
      { $lookup: { from: "builtys", localField: "builtyId", foreignField: "_id", as: "builty" } },
      { $unwind: { path: "$builty", preserveNullAndEmptyArrays: true } },
      
      // Join Polymorphic Expenses
      {
        $lookup: {
          from: "vehicleexpenses",
          let: { eId: "$expenseId", eModel: "$expenseModel" },
          pipeline: [{ $match: { $expr: { $and: [{ $eq: ["$_id", "$$eId"] }, { $eq: ["$$eModel", "Vehicleexpense"] }] } } }],
          as: "vehExp"
        }
      },
      {
        $lookup: {
          from: "driverexpenses",
          let: { eId: "$expenseId", eModel: "$expenseModel" },
          pipeline: [{ $match: { $expr: { $and: [{ $eq: ["$_id", "$$eId"] }, { $eq: ["$$eModel", "DriverExpense"] }] } } }],
          as: "drvExp"
        }
      },
      {
        $addFields: {
          expenseData: { $arrayElemAt: [{ $concatArrays: ["$vehExp", "$drvExp"] }, 0] }
        }
      },
      
      // Search Filter
      ...(search ? [{
        $match: {
          $or: [
            { "vehicle.vehicleNumber": { $regex: search, $options: "i" } },
            { "trip.vehicleName": { $regex: search, $options: "i" } },
            { "builty.tpNo": { $regex: search, $options: "i" } },
            { "builty.docNo": { $regex: search, $options: "i" } }
          ]
        }
      }] : []),

      // Final Projection
      {
        $project: {
          _id: 1,
          type: 1,
          amount: 1,
          balanceAfter: 1,
          date: 1,
          expenseModel: 1,
          createdAt: 1,
          driver: { _id: "$driver._id", name: "$driver.name" },
          vehicle: { _id: "$vehicle._id", vehicleNumber: "$vehicle.vehicleNumber" },
          trip: { _id: "$trip._id", vehicleName: "$trip.vehicleName", startLocation: "$trip.startLocation", endLocation: "$trip.endLocation" },
          builty: { _id: "$builty._id", tpNo: "$builty.tpNo", docNo: "$builty.docNo" },
          spentOn: {
            $cond: {
              if: { $eq: ["$expenseModel", "Vehicleexpense"] },
              then: "vehicle",
              else: {
                $cond: {
                  if: { $eq: ["$expenseModel", "DriverExpense"] },
                  then: "himself",
                  else: "N/A"
                }
              }
            }
          },
          expenseData: {
            $cond: { if: { $eq: ["$expenseData", null] }, then: "$$REMOVE", else: "$expenseData" }
          }
        }
      },
      { $sort: { date: -1, createdAt: -1 } }
    ];

    const [entries, totalResult] = await Promise.all([
      WalletLedger.aggregate([...pipeline, { $skip: skipNum }, { $limit: limitNum }]),
      WalletLedger.aggregate([...pipeline, { $count: "total" }])
    ]);

    const total = totalResult[0]?.total || 0;

    return res.status(200).json({
      message: "Driver ledger history fetched successfully",
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      deposite,
      withdraw,
      netBalance,
      ledger: entries
    });

  } catch (error) {
    console.error("Error in getDriverLedgerHistory:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred."
    });
  }
};