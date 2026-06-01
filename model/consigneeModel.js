const mongoose = require("mongoose");
const { maintenanceDB } = require("../database/database");

const consigneeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
   // ROLE BASED FIELDS
    supervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    supervisorName: { type: String },

    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker",
    },

    // SOFT DELETE
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

const Consignee = maintenanceDB.model("Consignee", consigneeSchema);
module.exports = Consignee;
