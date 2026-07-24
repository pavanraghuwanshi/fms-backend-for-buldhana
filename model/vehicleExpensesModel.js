const { maintenanceDB } = require("../database/database"); // ✅ Use second DB
const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
    },
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VehicleMaster",
      default: null,
    },
    builtyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Builty",
      default: null,
    },
    vehicleName: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    expenseType: {
      type: String,
      required: true,
    },
    fuel: { type: Number, required: false},
    date: {
      type: Date,
      default: () => {
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        return new Date(now.getTime() + istOffset);
      },
    },
    vendor: {
      type: String,
    },
    description: {
      type: String,
    },
    billImg: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VehicleExpenseImage",
    },
    paymentMode: {
      type: String,
    },
    location: {
      type: String
    },
    lat: {
      type: Number
    },
    long: {
      type: Number
    }
  },
  {
    timestamps: {
      currentTime: () => {
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        return new Date(now.getTime() + istOffset);
      },
    },
  }
);

const Vehicleexpense = maintenanceDB.model("Vehicleexpense", expenseSchema);
module.exports = Vehicleexpense;
