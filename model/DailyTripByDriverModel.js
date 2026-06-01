const mongoose = require("mongoose");
const { maintenanceDB } = require("../database/database");


const DailyTripByDriverSchema = new mongoose.Schema(
  {
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Device",
      required: true,
    },
    odometerStart: {
      type: Number,
      required: true,
      min: 0,
    },
    odometerEnd: {
      type: Number,
      min: 0,
      validate: {
        validator: function (v) {
          return !v || v >= this.odometerStart;
        },
        message: "Odometer end must be greater than start reading.",
      },
    },

    // 📍 Trip Timing
    startTime: {
      type: Date,
  },
    endTime: {
      type: Date,
    },
    totalDistance: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["started", "completed", "cancelled"],
      default: "started",
    },
    gpsKM:{
      type:Number,
      default:0
    },
    supervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

  },
    {
    timestamps: {
      currentTime: () => {
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        return new Date(now.getTime() + istOffset);
      },
    },
  });

// ✅ Automatically calculate total distance
DailyTripByDriverSchema.pre("save", function (next) {
  if (this.odometerStart && this.odometerEnd) {
    this.totalDistance = this.odometerEnd - this.odometerStart;
  }
  next();
});

const DailyTripByDriver = maintenanceDB.model('DailyTripByDriver', DailyTripByDriverSchema);
module.exports = DailyTripByDriver;