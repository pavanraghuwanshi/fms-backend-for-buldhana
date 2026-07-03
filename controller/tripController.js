const Trip = require("../model/tripModel");
const Driver = require("../model/driverModel");
const Subtrip = require("../model/subTripModel");
const VehicleMaster = require("../model/maintenanceDevice.model");

exports.createTrip = async (req, res) => {
  try {
    if (req.user.role !== "user") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    const payload = req.body;

    const trip = new Trip({
      ...payload,
      supervisorId: req.user.id,
    });

    await trip.save();

    await Driver.findByIdAndUpdate(payload.driverId, {
      currentVehicle: payload.vehicleId,
      currentVehicleName: payload.vehicleName,
      currentTripId: trip._id,
      deviceId:payload.vehicleId
    });

    return res.status(201).json(trip);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getAllTrips = async (req, res) => {
  try {
    let trips = [];

    if (req.user.role === "superadmin") {
      const { supervisorId } = req.query;
      const query = supervisorId ? { supervisorId } : {};

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
    } else if (req.user.role === "user") {
      trips = await Trip.find({ supervisorId: req.user.id })
       .populate({
          path: "driverId",
          select: "name deviceId",
          populate: {
            path: "deviceId",
            select: "vehicleNumber",
          },
        })
        .sort({ createdAt: -1 });
    } else if (req.user.role === "driver") {
      trips = await Trip.find({ driverId: req.user.id })
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
    );

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