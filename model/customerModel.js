const { default: mongoose } = require("mongoose");
const { maintenanceDB } = require("../database/database");

const customerSchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      required: true,
      trim: true,
    },

    mobileNumber: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    address: {
      type: String,
      default: "",
      trim: true,
    },
    pickupLocation:{
      type:String
    },
    dropLocation:{
      type:String
    },
    gstNumber: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
    },

    zoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Zone",
      required: true,
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

customerSchema.index(
  { mobileNumber: 1, supervisorId: 1, supervisorModel: 1 },
  { unique: true }
);

module.exports = maintenanceDB.model("Customer", customerSchema);