const { default: mongoose } = require("mongoose");
const { maintenanceDB } = require("../database/database");

const dailyBuiltySchema = new mongoose.Schema(
  {
    tpNo: {
      type: String,
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

    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
    },

    // NEW
    driverName: {
      type: String,
      trim: true,
    },

    // NEW
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VehicleMaster",
    },

    // NEW
    vehicleName: {
      type: String,
      trim: true,
    },

    consignerName: {
      type: String,
      required: true,
      trim: true,
    },

    // NEW (consignor alias agar id bhi rakhna hai)
    consignorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    consigneeName: {
      type: String,
      required: true,
      trim: true,
    },

    // NEW
    consigneeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    pickupLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: true,
    },

    destinationLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: true,
    },

    vehicleNumber: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    grossVehicleWeight: {
      type: Number,
      required: true,
    },

    // NEW
    emptyWeight: {
      type: Number,
      default: 0,
    },

    // NEW
    loadingWeight: {
      type: Number,
      default: 0,
    },

    // NEW
    deliveryWeight: {
      type: Number,
      default: 0,
    },

    // NEW
    transportRate: {
      type: Number,
      default: 0,
    },

    products: [
      {
        // NEW
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },

        productName: {
          type: String,
          required: true,
        },

        quantity: {
          type: Number,
          required: true,
        },

        unit: {
          type: String,
          required: true,
        },
      },
    ],

    remark: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["Created", "Completed", "Cancelled"],
      default: "Created",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    createdByRole: {
      type: String,
      required: true,
    },

    cancelReason: {
      type: String,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const DailyBuilty = maintenanceDB.model(
  "DailyBuilty",
  dailyBuiltySchema
);

module.exports = DailyBuilty;