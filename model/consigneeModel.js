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
