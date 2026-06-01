const Trip = require("../model/tripModel");
const Driver = require("../model/driverModel");
const Subtrip = require("../model/subTripModel");
const Device = require("../model/deviceModel");
const History = require("../model/credenceHistoryModel");

exports.createTrip = async (req, res) => {
  try {
    if (req.user.role === "user") {
      const payload = req.body;
      const trip = new Trip({
        ...payload,
        supervisorId: req.user.id,
      });
      await trip.save();
      await Driver.findByIdAndUpdate(req.body.driverId, {
        currentVehicle: req.body.vehicleId,
        currentVehicleName: req.body.vehicleName,
        currentTripId: trip._id,
      });
      return res.status(201).json(trip);
    } else {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

exports.getAllTrips = async (req, res) => {
  try {
    let trips = [];

    if (req.user.role === "superadmin") {
      const { supervisorId } = req.query;
      const query = supervisorId ? { supervisorId } : {};
      trips = await Trip.find(query).populate("driverId", "name").sort({ createdAt: -1 });
    } else if (req.user.role === "user") {
      trips = await Trip.find({ supervisorId: req.user.id }).populate("driverId", "name").sort({ createdAt: -1 });
    } else if (req.user.role === "driver") {
      trips = await Trip.find({ driverId: req.user.id }).populate("driverId", "name").sort({ createdAt: -1 });
    } else {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    // For each trip, get the related SubTrip's budgetAllocated
    const tripsWithBudget = await Promise.all(
      trips.map(async (trip) => {
        const subTrip = await Subtrip.findOne({ tripId: trip._id }).select("budgetAllocated");
        return {
          ...trip.toObject(),
          subTripBudgetAllocated: subTrip?.budgetAllocated || 0,
        };
      })
    );
    return res.status(200).json(tripsWithBudget);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateTrip = async (req, res) => {
  try {
    const getGPSDistance = async (deviceId) => {
      try {
        let endDate = new Date();
        endDate.setHours(0, 0, 0, 0);
        endDate = new Date(endDate.getTime() + 5.5 * 60 * 60 * 1000);

        const query = {
          deviceId: Number(deviceId),
          createdAt: { $gte: new Date(endDate) },
          "attributes.totalDistance": { $exists: true },
        };

        const firstEntry = await History.findOne(query).sort({ createdAt: 1 }).select("attributes.totalDistance").lean()

        return (firstEntry?.attributes?.totalDistance || 0) / 1000;
      } catch (error) {
        console.error("Error calculating GPS distance:", error.message);
        return 0;
      }
    };
    if (!['user', 'driver'].includes(req.user.role)) return res.status(403).json({ success: false, message: 'Unauthorized access' });
    const tripId = req.params.tripId;

    if (req.body.status === 'completed') {
      const subtrips = await Subtrip.find({ tripId }).select('status').lean();
      if (subtrips.some(subtrip => subtrip.status === 'in-progress')) return res.status(400).json({ success: false, message: 'Cannot complete trip: One or more subtrips are in-progress' });
    }

    if (req.user.role === 'user') {
      const trip = await Trip.findOneAndUpdate(
        { _id: tripId, supervisorId: req.user.id },
        req.body,
        {
          new: true,
          runValidators: true,
        }
      );

      if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

      // Update driver assignments if vehicleId is provided
      if (req.body.vehicleId) {
        const vehicle = await Device.findById(req.body.vehicleId).select('name');
        if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });
        await Driver.findByIdAndUpdate(trip.driverId, { currentVehicle: req.body.vehicleId, currentVehicleName: vehicle.name });
      }

      // Update driver assignments if driverId is provided
      if (req.body.driverId) {
        await Driver.findOneAndUpdate({ currentTripId: trip._id }, { currentVehicle: null, currentVehicleName: null, currentTripId: null });
        const vehicle = req.body.vehicleId ? await Device.findById(req.body.vehicleId).select('name') : { name: null };
        await Driver.findByIdAndUpdate(req.body.driverId, { currentVehicle: req.body.vehicleId || null, currentVehicleName: vehicle ? vehicle.name : null, currentTripId: trip._id });
      }

      if (trip.status === 'completed') {
        if (trip.driverCheckIn) {
          const device = await Device.findById(trip.vehicleId).select('deviceId');
          if (device) {
            const endOdometerReading = await getGPSDistance(device.deviceId);
            await Trip.findByIdAndUpdate(tripId, { endOdometerReading });
          }
        }
        await Driver.findByIdAndUpdate(trip.driverId, { currentVehicle: null, currentVehicleName: null, currentTripId: null });
      }
      return res.status(200).json({ success: true, message: 'Trip updated successfully' });
    } else if (req.user.role === 'driver') {
      const trip = await Trip.findById(tripId).select('status driverId vehicleId driverCheckIn');
      if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
      if (trip.status !== 'in-progress') return res.status(400).json({ success: false, message: `Trip is ${trip.status}, you can't change its status` });

      const updatedField = {};
      if (req.body.status === "completed") {
        updatedField.status = req.body.status;
        if (trip.driverCheckIn) {
          const device = await Device.findById(trip.vehicleId).select('deviceId');
          if (device) {
            const endOdometerReading = await getGPSDistance(device.deviceId);
            updatedField.endOdometerReading = endOdometerReading;
          }
        }
      }

      const updatedTrip = await Trip.findByIdAndUpdate(
        tripId,
        { $set: updatedField },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!updatedTrip) return res.status(404).json({ success: false, message: 'Trip not found' });

      if (updatedTrip.status === 'completed') {
        await Driver.findByIdAndUpdate(trip.driverId, {
          currentVehicle: null,
          currentVehicleName: null,
          currentTripId: null,
        });
      }

      return res.status(200).json({ success: true, message: 'Trip status updated successfully' });
    }
  } catch (error) {
    console.error('Error updating trip:', error);
    return res.status(400).json({ message: error.message });
  }
};

exports.deleteTrip = async (req, res) => {
  try {
    if (req.user.role === "user") {
      const trip = await Trip.findOneAndDelete({
        _id: req.params.tripId,
        supervisorId: req.user.id,
      });
      if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });

      await Driver.findByIdAndUpdate(trip.driverId, {
        currentVehicle: null,
        currentVehicleName: null,
        currentTripId: null,
      });
      return res.status(200).json({ success: true, message: "Trip deleted successfully" });
    } else {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTripByVehicleId = async (req, res) => {
  try {
    const vehicleId = req.params.id;
    const trip = await Trip.find({ vehicleId }).populate("driverId", "-_id name").select('-vehicleId -supervisorId -__v ');
    if (!trip.length) return res.status(404).json({ success: false, message: "Trip not found" });
    return res.status(200).json(trip);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTripByDriverId = async (req, res) => {
  try {
    const trips = await Trip.find({ driverId: req.params.id }).populate("driverId", "name");
    if (!trips.length) return res.status(404).json({ success: false, message: "No Trip found" });
    return res.status(200).json(trips);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTripAnalyticsByTripId = async (req, res) => {
  try {
    const [trips, subtrip] = await Promise.all([
      Trip.findById(req.params.id).populate("driverId", "-_id name").select('-__v -vehicleId -createdAt'),
      Subtrip.find({ tripId: req.params.id }).select('-__v -tripId')
    ]);
    if (!trips) return res.status(404).json({ success: false, message: "No Trip found" });
    return res.status(200).json({ trips, subtrip });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.tripCheckIn = async (req, res) => {
  try {
    if (req.user.role !== "driver") return res.status(403).json({ success: false, message: "Unauthorized access" });
    const driver = await Driver.findById(req.user.id).select("currentTripId currentVehicle");
    if (!driver) return res.status(404).json({ success: false, message: "Driver not found" });
    if (!driver.currentTripId) return res.status(400).json({ success: false, message: "No trip assigned to this driver" });
    if (!driver.currentVehicle) return res.status(400).json({ success: false, message: "No vehicle assigned to this driver" });

    const [trip, device] = await Promise.all([
      Trip.findById(driver.currentTripId).select("status driverCheckIn vehicleId"),
      Device.findById(driver.currentVehicle).select("deviceId")
    ])

    if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });
    if (trip.status !== "in-progress") return res.status(400).json({ success: false, message: `Trip is ${trip.status}, you can't check-in` });
    if (trip.driverCheckIn) return res.status(400).json({ success: false, message: "Driver already checked in for this trip" });
    if (!trip.vehicleId) return res.status(400).json({ success: false, message: "No vehicle assigned to this trip" });

    const getGPSDistance = async (deviceId) => {
      try {
        let startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        startDate = new Date(startDate.getTime() + 5.5 * 60 * 60 * 1000);

        const query = {
          deviceId: Number(deviceId),
          createdAt: { $gte: new Date(startDate) },
          "attributes.totalDistance": { $exists: true },
        };

        const firstEntry = await History.findOne(query).sort({ createdAt: 1 }).select("attributes.totalDistance").lean()

        return (firstEntry?.attributes?.totalDistance || 0) / 1000;
      } catch (error) {
        console.error("Error calculating GPS distance:", error.message);
        return 0;
      }
    };

    if (!device) return res.status(404).json({ success: false, message: "Device not found for vehicle" });
    const startOdometerReading = await getGPSDistance(device.deviceId);

    trip.driverCheckIn = true;
    trip.startOdometerReading = startOdometerReading;
    await trip.save();
    return res.status(200).json({ success: true, message: "Driver checked in successfully", startOdometerReading });
  } catch (error) {
    console.error("Error in tripCheckIn:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDutySlipByTripId = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id).populate("driverId", "-_id name contactNumber").populate("companyId").select('-__v -createdAt -driverCheckIn -spentAmount ').lean();
    if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });
    if (trip.status !== "completed") return res.status(400).json({ success: false, message: "Trip is not completed yet. You can't generate slip until the trip is completed." });

    const mileage = await Device.findById(trip.vehicleId).select('average').lean();
    if (mileage) trip.mileage = mileage.average;
    return res.status(200).json(trip);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
