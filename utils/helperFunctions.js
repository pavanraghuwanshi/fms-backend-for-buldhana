const sharp = require("sharp");
const Trip = require("../model/tripModel.js");
const Builty = require("../model/builtyModel.js");

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
 * - If providedBuiltyId is sent: finds the trip linked to that builty (or falls back to driver's currentTripId) and sets activeBuiltyId to providedBuiltyId.
 * - If providedBuiltyId is not sent: fetches driver's current trip and finds the builty with status 'Dispatched'.
 */
exports.resolveTripAndActiveBuilty = async (providedBuiltyId, driver) => {
  let trip = null;
  let activeBuiltyId = null;

  if (providedBuiltyId) {
    activeBuiltyId = providedBuiltyId;
    trip = await Trip.findOne({
      $or: [{ builtyId: providedBuiltyId }, { builtyIds: providedBuiltyId }],
    });
    if (!trip && driver?.currentTripId) {
      trip = await Trip.findById(driver.currentTripId);
    }
  } else {
    if (driver?.currentTripId) {
      trip = await Trip.findById(driver.currentTripId);
    }
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

    const driverId = driver?._id || driver;
    if (!dispatchedBuilty && driverId) {
      dispatchedBuilty = await Builty.findOne({
        driverId: driverId,
        status: "Dispatched",
      }).sort({ createdAt: -1 });
    }

    activeBuiltyId = dispatchedBuilty
      ? dispatchedBuilty._id
      : trip?.builtyId ||
        (trip?.builtyIds && trip.builtyIds.length > 0
          ? trip.builtyIds[trip.builtyIds.length - 1]
          : null);
  }

  return { trip, activeBuiltyId };
};