const { maintenanceDB } = require("../database/database");
const mongoose = require("mongoose");

const assignmentHistorySchema = new mongoose.Schema(
  {
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VehicleMaster",
      required: true,
      index: true,
    },
    vehicleNumber: {
      type: String,
      trim: true,
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
      index: true,
    },
    driverName: {
      type: String,
      trim: true,
    },
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      default: null,
      index: true,
    },
    builtyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Builty",
      default: null,
      index: true,
    },
    action: {
      type: String,
      enum: ["ASSIGNED", "UNASSIGNED"],
      required: true,
      index: true,
    },
    actionBy: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    actionByRole: {
      type: String,
      default: null,
    },
    reason: {
      type: String,
      default: "",
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

const AssignmentHistory = maintenanceDB.model("AssignmentHistory", assignmentHistorySchema);
module.exports = AssignmentHistory;
