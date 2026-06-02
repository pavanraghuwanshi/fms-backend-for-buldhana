const mongoose = require("mongoose");
const { maintenanceDB } = require("../database/database");

const vehicleCategorySchema = new mongoose.Schema(
  {
    categoryName: {
      type: String,
      required: true,
      trim: true,
    },

    wheelerType: {
      type: String,
      required: true,
      trim: true,
      // example: "2 Wheeler", "3 Wheeler", "4 Wheeler", "6 Wheeler", "10 Wheeler"
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