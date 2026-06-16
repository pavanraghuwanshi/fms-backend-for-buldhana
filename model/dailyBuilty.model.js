const { default: mongoose } = require("mongoose");
const { maintenanceDB } = require("../database/database");

const dailyBuiltySchema = new mongoose.Schema(
  {
    tpNo: { type: String, required: true },

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

    driverName: { type: String, trim: true },

    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VehicleMaster",
    },

    vehicleName: { type: String, trim: true },

    consignerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    consignerName: {
      type: String,
      required: true,
      trim: true,
    },

    consigneeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    consigneeName: {
      type: String,
      required: true,
      trim: true,
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

    grossVehicleWeight: { type: Number, required: true },

    emptyWeight: { type: Number, required: true },
    loadingWeight: { type: Number, required: true },
    deliveryWeight: { type: Number, required: true },
    transportRate: { type: Number, required: true },

    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        productName: { type: String, default: "" },
        quantity: { type: Number, default: 0 },
        unit: { type: String, default: "" },
      },
    ],

    remark: { type: String, default: "" },

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

    cancelReason: { type: String, default: "" },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = maintenanceDB.model("DailyBuilty", dailyBuiltySchema);