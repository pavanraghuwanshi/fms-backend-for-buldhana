const mongoose = require("mongoose");
const { maintenanceDB } = require("../database/database");

const vehicleMasterSchema = new mongoose.Schema(
  {
    vehicleNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    make: {
      type: String,
      required: true,
      trim: true,
    },

    emptyVehicleWeight: {
      type: Number,
      required: true,
      min: 0,
    },
    grossVehicleWeight: {
      type: Number,
      required: false,
      min: 0,
    },
    transporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transporter",
      required: false,
    },

    supervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const VehicleMaster = maintenanceDB.model("VehicleMaster", vehicleMasterSchema);
module.exports = VehicleMaster;