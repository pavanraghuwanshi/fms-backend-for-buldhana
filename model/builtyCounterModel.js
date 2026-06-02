const mongoose = require("mongoose");
const { maintenanceDB } = require("../database/database");

const builtyCounterSchema = new mongoose.Schema(
  {
    supervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    supervisorModel: {
      type: String,
      required: true,
      enum: ["School", "Branch", "BranchGroup"],
    },

    seq: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

builtyCounterSchema.index(
  {
    supervisorId: 1,
    supervisorModel: 1,
  },
  { unique: true }
);

module.exports = maintenanceDB.model("BuiltyCounter",builtyCounterSchema);