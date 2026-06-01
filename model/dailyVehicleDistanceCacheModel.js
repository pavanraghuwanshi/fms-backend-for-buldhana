// model/dailyVehicleDistanceCacheModel.js
const mongoose = require("mongoose");
const { credenceDB } = require("../database/database");

const dailyVehicleDistanceCacheSchema = new mongoose.Schema(
  {
    uniqueId: {
      type: String,
      required: true,
      index: true,
    },
    startOdo: {
      type: Number,
      default: 0,
    },
    totalKm: {
      type: String,
      default: "0",
    },
  },
  {
    timestamps: true,
  }
);

// exact collection name
const DailyVehicleDistanceCache = credenceDB.model(
  "DailyVehicleDistanceCache",
  dailyVehicleDistanceCacheSchema,
  "daily_vehicle_distance_caches"
);

module.exports = DailyVehicleDistanceCache;