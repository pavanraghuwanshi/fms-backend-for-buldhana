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

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VehicleCategory",
    },

    make: {
      type: String,
      required: true,
      trim: true,
    },
    isAssigned: {
    type: Boolean,
    default: false,
    index: true,
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
        refPath: "supervisorModel",
        required: true,
      },
      supervisorModel: {
        type: String,
        required: true,
        enum: ["School", "Branch", "BranchGroup"],
      },
  },
  { timestamps: true }
);

const VehicleMaster = maintenanceDB.model("VehicleMaster", vehicleMasterSchema);
module.exports = VehicleMaster;