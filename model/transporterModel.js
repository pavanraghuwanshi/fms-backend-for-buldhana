const mongoose = require("mongoose");
const { maintenanceDB } = require("../database/database");

const transporterSchema = new mongoose.Schema(
  {
    transporterName: {
      type: String,
      required: true,
      trim: true,
    },

    contactPerson: {
      type: String,
      trim: true,
    },

    contactNumber: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    address: {
      type: String,
      trim: true,
    },

    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },

    panNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
    supervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "supervisorModel",
      required: true,
    },
    accountHolderName: {
        type: String,
        trim: true,
      },
    accountNumber: {
        type: String,
        trim: true,
      },
    bankName: {
        type: String,
        trim: true,
      },
    ifscCode: {
        type: String,
        trim: true,
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

const Transporter = maintenanceDB.model(
  "Transporter",
  transporterSchema
);

module.exports = Transporter;