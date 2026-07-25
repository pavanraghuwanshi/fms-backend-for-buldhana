const sharp = require("sharp");
const Trip = require("../model/tripModel.js");
const Builty = require("../model/builtyModel.js");
const VehicleMaster = require("../model/maintenanceDevice.model.js");
const Driver = require("../model/driverModel.js");

// Function to compress and convert image to Base64
exports.compressImage = async (image) => {
  try {
    const mime = image.mimetype;
    if (mime.startsWith("image/")) {
      const compressedBuffer = await sharp(image.buffer).jpeg({ quality: 60 }).toBuffer();
      return {
        base64Data: compressedBuffer.toString("base64"),
        contentType: mime
      };
    } else if (mime === "application/pdf") {
      return {
        base64Data: image.buffer.toString("base64"),
        contentType: mime
      };
    }
    throw new Error("Unsupported file type");
  } catch (error) {
    console.error("Image compression error:", error);
    throw new Error("Image compression failed");
  }
};

exports.getDuration = (start, end) => {
  const startTime = new Date(start);
  const endTime = new Date(end);
  const durationInSeconds = (endTime - startTime) / 1000;

  const days = Math.floor(durationInSeconds / (3600 * 24));
  const hours = Math.floor((durationInSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((durationInSeconds % 3600) / 60);

  let result = '';
  if (days > 0) result += `${days}D `;
  if (hours > 0 || days > 0) result += `${hours}H `;
  result += `${minutes}M`;

  return result.trim();
};

/**
 * Resolves the trip and active builty for a given driver expense / vehicle expense.
 * - If providedBuiltyId is sent: finds the trip linked to that builty (or falls back to driver's currentTripId / in-progress trip) and sets activeBuiltyId to providedBuiltyId.
 * - If providedBuiltyId is not sent: fetches driver's current in-progress trip and finds the builty with status 'Dispatched'.
 */
exports.resolveTripAndActiveBuilty = async (providedBuiltyId, driver) => {
  let trip = null;
  let activeBuiltyId = null;
  const driverId = driver?._id ? driver._id : driver;
  const currentTripId = driver?.currentTripId ? driver.currentTripId : null;

  if (providedBuiltyId) {
    activeBuiltyId = providedBuiltyId;
    trip = await Trip.findOne({
      $or: [{ builtyId: providedBuiltyId }, { builtyIds: providedBuiltyId }],
    });
    if (!trip && currentTripId) {
      trip = await Trip.findById(currentTripId);
    }
    if (!trip && driverId) {
      trip = await Trip.findOne({ driverId, status: "in-progress" }).sort({ createdAt: -1 });
    }
  } else {
    // 1. Try finding trip by currentTripId first, or by driverId with status in-progress
    if (currentTripId) {
      trip = await Trip.findById(currentTripId);
    }
    if (!trip && driverId) {
      trip = await Trip.findOne({ driverId, status: "in-progress" }).sort({ createdAt: -1 });
    }

    // 2. Search for dispatched builty
    const builtyIdsToSearch = [
      ...(trip?.builtyId ? [trip.builtyId] : []),
      ...(trip?.builtyIds || []),
    ];

    let dispatchedBuilty = null;
    if (builtyIdsToSearch.length > 0) {
      dispatchedBuilty = await Builty.findOne({
        _id: { $in: builtyIdsToSearch },
        status: "Dispatched",
      });
    }

    if (!dispatchedBuilty && driverId) {
      dispatchedBuilty = await Builty.findOne({
        driverId: driverId,
        status: "Dispatched",
      }).sort({ createdAt: -1 });
    }

    if (dispatchedBuilty) {
      activeBuiltyId = dispatchedBuilty._id;
      // If trip wasn't found yet, find the trip associated with this dispatched builty
      if (!trip) {
        trip = await Trip.findOne({
          $or: [{ builtyId: dispatchedBuilty._id }, { builtyIds: dispatchedBuilty._id }],
        });
      }
    } else {
      activeBuiltyId =
        trip?.builtyId ||
        (trip?.builtyIds && trip.builtyIds.length > 0
          ? trip.builtyIds[trip.builtyIds.length - 1]
          : null);
    }
  }

  return { trip, activeBuiltyId };
};

/**
 * Unassigns a vehicle and driver when a trip is completed.
 * - Sets VehicleMaster isAssigned to false
 * - Sets Driver isAssigned to false, deviceId, currentVehicle, currentVehicleName, currentTripId to null
 */
exports.unassignVehicleAndDriver = async (vehicleId, driverId) => {
  if (vehicleId) {
    await VehicleMaster.findByIdAndUpdate(vehicleId, {
      isAssigned: false,
    });
  }
  if (driverId) {
    await Driver.findByIdAndUpdate(driverId, {
      $set: {
        isAssigned: false,
        deviceId: null,
        currentVehicle: null,
        currentVehicleName: null,
        currentTripId: null,
      },
    });
  }};