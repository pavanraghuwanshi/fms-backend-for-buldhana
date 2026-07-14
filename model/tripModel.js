const { maintenanceDB } = require("../database/database");
const mongoose = require("mongoose");

const tripSchema = new mongoose.Schema(
  {
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: [true, "Driver is required please select driver"],
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Device",
      required: [true, "Vehicle is required please select vehicle"],
    },
    vehicleName: {
      type: String,
      required: true,
    },
    supervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    builtyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Builty",
      default: null,
    },
    builtyIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Builty",
      },
    ],
    startLocation: {
      type: String,
      required: [true, "Start location is required"],
    },
    endLocation: {
      type: String,
      required: [true, "End location is required"],
    },
    materialType: {
      type: String,
      // required: [true, "Material type is required"],
    },
    date: {
      type: Date,
      default: () => {
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        return new Date(now.getTime() + istOffset);
      },
    },
    budgetAllocated: {
      type: Number,
      default: 0,
    },
    spentAmount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["completed", "cancelled", "in-progress"],
      default: "in-progress",
    },
    driverCheckIn: {
      type: Boolean,
      default: false,
    },
    startOdometerReading: {
      type: Number,
    },
    endOdometerReading: {
      type: Number,
    },
    transportMode: {
      type: String,
      enum: ["transport", "travel"],
    },
    clientName: {
      type: String,
    },
    clientNumber: {
      type: Number,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },
    companyName: {
      type: String,
    },
    clientAdvance: {
      type: Number,
      default: 0,
    },
    coastPerKm: {
      type: Number,
      default: 0,
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
  }
);

const Trip = maintenanceDB.model("Trip", tripSchema);
module.exports = Trip