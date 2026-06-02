const mongoose = require("mongoose");
const { maintenanceDB } = require("../database/database");

const consignorSchema = new mongoose.Schema(
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
        pincode: {
      type: String,
      trim: true,
    },
    contactNumber: {
      type: String,
      trim: true,
    },
    contactPerson: {
      type: String,
      trim: true,
    },
    gstNumber: {
      type: String,
      trim: true,
    },
    panNumber: {
      type: String,
      trim: true,
    },
  supervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    supervisorName: {
      type: String,
      trim: true,
    },

    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker",
    },

    // ✅ SOFT DELETE
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

const Consignor = maintenanceDB.model("Consignor", consignorSchema);
module.exports = Consignor;