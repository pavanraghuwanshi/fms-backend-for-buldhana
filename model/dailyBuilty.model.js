const { default: mongoose } = require("mongoose");
const { maintenanceDB } = require("../database/database");

const dailyBuiltyProductSchema = new mongoose.Schema(
  {
    productName: { type: String, default: "", trim: true },
    productWeight: { type: Number, default: 0 },
    bags: { type: Number, default: 0 },
    bagSize: {type: Number, default : 0 }
  },
  { _id: false }
);

const dailyBuiltySchema = new mongoose.Schema(
  {
    tpNo: { type: String, required: true },

    date: { type: Date, required: true },

    docNo: { type: String, required: true, trim: true },

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

    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VehicleMaster",
      required: true,
    },

    vehicleNumber: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
    },
    totalKm: {
      type: Number,
      default: 0,
    },
    driverName: { type: String, required: true, trim: true },

    totalBags: { type: Number, required: true },
    totalBagsWeight: { type: Number, },

    pickupLocation: { type: String, required: true, trim: true },


    dropLocation: { type: String, required: true, trim: true },


    products: {
      type: [dailyBuiltyProductSchema],
      required: true,
      default: [],
    },

    startOdometerReading: { type: Number, required: true },
    endOdometerReading: { type: Number, required: true },

    zoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Zone",
      required: true,
    },

    zoneName: { type: String, required: true, trim: true },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    customerName: { type: String, required: true, trim: true },

    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      default: null,
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

    cancelReason: { type: String, default: "" },

  },
  { timestamps: true }
);

module.exports = maintenanceDB.model("DailyBuilty", dailyBuiltySchema);