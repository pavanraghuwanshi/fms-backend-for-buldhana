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
    transportRateType: { type: String, enum: ["fixed", "per_ton","per_quintal"] },
    shortageDeductionRate: { type: Number, default: 0 },
    description:{type:String},
    vendorType: {type:String},
    
    // booking mode is not used
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
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
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
    paymentStatus: {
    type: String,
    enum: ["Pending", "Partial", "Completed"],
    default: "Pending",
  },
  bagType: {
  type: String,
  enum:["Plastic","Jute"],
  },
  bagWeight: {
    type: Number,
    min: 0,
  },

  docNo: {
    type: String,
    trim: true,
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

    dispatchDate: {
      type: Date,
    },

    startOdometerReading: {
      type: Number,
      default: 0,
    },

    weightPerBag: {
      type: Number,
      default: 0,
    },

    numberOfBags: {
      type: Number,
      default: 0,
    },

    tareWeightUnit: {
      type: String,
      enum: ["KG", "Qtl", "MT"],
    },

    grossWeightUnit: {
      type: String,
      enum: ["KG", "Qtl", "MT"],
    },

    netWeight: {
      type: Number,
      default: 0,
    },

    freightRate: {
      type: Number,
      default: 0,
    },

    freightRateUnit: {
      type: String,
      enum: ["KG", "Qtl", "MT", "Bag"],
    },

    fareAmount: {
      type: Number,
      default: 0,
    },

    fareAmountAdvance: {
      type: Number,
      default: 0,
    },

    loadKataCharge: {
      type: Number,
      default: 0,
    },

    loadingCharge: {
      type: Number,
      default: 0,
    },
    isLessDelivered: {
      type: Boolean,
      default: false,
    },
    vehicleExpenseAmount:{
      type:Number,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
    },
    driverCommissionType: {
      type: String,
      enum: ["none", "percentage", "fixed"],
      default: "none",
    },
    driverCommissionPercentage:{
      type:Number
    },
    driverCommissionAmount: {
      type: Number,
      default: 0,
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