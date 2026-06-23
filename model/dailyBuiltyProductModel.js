const mongoose = require("mongoose");
const { maintenanceDB } = require("../database/database");

const dailyBuiltyProductSchema = new mongoose.Schema(
  {
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
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      default: "",
      trim: true,
    },

    unit: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

dailyBuiltyProductSchema.index(
  { supervisorId: 1, supervisorModel: 1, name: 1 },
  { unique: true }
);

module.exports = maintenanceDB.model(
  "DailyBuiltyProductList",
  dailyBuiltyProductSchema
);