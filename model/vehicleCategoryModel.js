const mongoose = require("mongoose");
const { maintenanceDB } = require("../database/database");

const vehicleCategorySchema = new mongoose.Schema(
  {
    categoryName: {
      type: String,
      required: true,
      trim: true,
    },


    tyreCount: {
      type: Number,
      required: true,
    },

    supervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    supervisorModel: {
      type: String,
      required: true,
      enum: ["School", "Branch", "BranchGroup"],
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);


const VehicleCategory = maintenanceDB.model("VehicleCategory",vehicleCategorySchema);

module.exports = VehicleCategory;