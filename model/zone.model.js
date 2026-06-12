const { default: mongoose } = require("mongoose");
const { maintenanceDB } = require("../database/database");

const zoneSchema = new mongoose.Schema(
  {
    zoneName: {
      type: String,
      required: true,
      trim: true,
    },

    supervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "supervisorModel",
    },

    supervisorModel: {
      type: String,
      required: true,
      enum: ["School", "Branch", "BranchGroup"],
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    createdByRole: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

zoneSchema.index(
  { zoneName: 1, supervisorId: 1, supervisorModel: 1 },
  { unique: true }
);

module.exports = maintenanceDB.model("Zone", zoneSchema);