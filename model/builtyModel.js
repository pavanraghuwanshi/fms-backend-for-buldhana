const mongoose = require("mongoose");
const { maintenanceDB } = require("../database/database");

const builtyProductSchema = new mongoose.Schema(
  {
    productName: { type: String,required:true, trim: true },
    quantity: { type: Number, default: 0 },
    unit: { type: String, trim: true }, // MT / Bags / Kg
    bagSize: { type: Number },
    totalBags: { type: Number },
    remarks: { type: String, trim: true },
  },
  { _id: false }
);

const builtySchema = new mongoose.Schema(
  {
    tpNo: {
      type: String,
      required: true,
    },

    date: {
      type: Date,
      default: Date.now,
    },

    consignerName: {
      type: String,
      required: true,
      trim: true,
    },

    consignerContactNumber: {
      type: String,
      trim: true,
    },

    consigneeName: {
      type: String,
      required: true,
      trim: true,
    },

    consigneeContactNumber: {
      type: String,
      trim: true,
    },

    destinationLocation: {
      type: String,
      trim: true,
    },
    pickupLocation:{
      type: String,
      trim: true,
    },
    pickupLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
    },

    destinationLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
    },
    vehicleOwnership: {
      type: String,
      enum: ["self", "market"],
      required: true,
    },
    transportRateAmount: { type: Number, default: 0 },
    transportRateType: { type: String, enum: ["fixed", "per_ton"] },
    shortageDeductionRate: { type: Number, default: 0 },

    bookingMode: {
      type: String,
      enum: ["transporter", "self"],
      required: true,
    },

    transporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transporter",
      default: null,
    },

    commissionAgentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CommissionAgent",
      default: null,
    },

    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
        ref: "VehicleMaster",
      default: null,
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

    advanceMode: {
      type: String,
      enum: ["cash", "fuel", "cash_fuel","upi","bank_transfer","other"],
    },

    advanceAmount: {
      type: Number,
      default: 0,
    },

    advanceDieselLiters: {
      type: Number,
      default: 0,
    },

    permittedGVW: {
      type: Number,
    },

    tareWeight: {
      type: Number,
    },

    grossWeight: {
      type: Number,
    },

    discountWeight: {
      type: Number,
      default: 0,
    },

    loadingEmptyWeight: {
      type: Number,
      default: null,
    },

    loadingLoadedWeight: {
      type: Number,
      default: null,
    },

    loadingMaterialWeight: {
      type: Number,
      default: null,
    },

    deliveryLoadedWeight: {
      type: Number,
      default: null,
    },

    deliveryEmptyWeight: {
      type: Number,
      default: null,
    },

    deliveryMaterialWeight: {
      type: Number,
      default: null,
    },

    products: [builtyProductSchema],

    status: {
      type: String,
      enum: ["Created", "Dispatched", "Completed", "Cancelled"],
      default: "Created",
    },

    cancelReason: {
      type: String,
      trim: true,
    },

    completedAt: {
      type: Date,
    },

    cancelledAt: {
      type: Date,
    },

    supervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      default: null,
    },
    consignerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Consignor",
    required: true,
    },

    consigneeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Consignee",
    required: true,
    },
    supervisorModel: {
      type: String,
      required: true,
      enum: ["School", "Branch", "BranchGroup"],
    },
    deliveryStatus: {
      type: String,
      enum: ["Delivered", "Less Delivered"],
      default: "Delivered",
    },

    paymentCutAmount: {
      type: Number,
      default: null,
    },

    isLessDelivered: {
      type: Boolean,
      default: false,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
    },

    createdByRole: {
      type: String,
    },

    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  { timestamps: true }
);

builtySchema.index(
  { supervisorId: 1, supervisorModel: 1, tpNo: 1 },
  { unique: true }
);

module.exports = maintenanceDB.model("Builty", builtySchema);