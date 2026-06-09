const mongoose = require("mongoose");
const { maintenanceDB } = require("../database/database");

const locationSchema = new mongoose.Schema(
  {
    locationName: {
      type: String,
      required: true,
      trim: true,
    },

    latitude: {
      type: Number,
      default: null,
    },

    longitude: {
      type: Number,
      default: null,
    },

    supervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "supervisorModel",
      index: true,
    },

    supervisorModel: {
      type: String,
      required: true,
      enum: ["School", "Branch", "BranchGroup"],
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    createdByRole: {
      type: String,
    },
  },
  { timestamps: true }
);

locationSchema.index(
  { locationName: 1, supervisorId: 1, supervisorModel: 1 },
  { unique: true }
);

module.exports = maintenanceDB.model("Location", locationSchema);