const mongoose = require("mongoose");
const { maintenanceDB } = require("../database/database");

const commissionAgentSchema = new mongoose.Schema(
  {
    agentName: {
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

    transporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transporter",
      required: false,
      default: null,
    },

    agentSide: {
      type: String,
      enum: ["our", "transporter"],
      default: "our",
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

    supervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);


const CommissionAgent = maintenanceDB.model("CommissionAgent", commissionAgentSchema);
module.exports = CommissionAgent;