const mongoose = require("mongoose");
const { maintenanceDB } = require("../database/database");

const ExpenseSchema = new mongoose.Schema(
  {
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Device",
      required: [true, "You have not been assigned a vehicle"],
    },
    vehicleName: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: [true, "Please enter amount"],
    },
    shopName: {
      type: String
    },
    location: {
      type: String
    },
    description: {
      type: String,
      required: [true, "Please add details"],
    },
    date: {
      type: Date,
      default: () => {
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        return new Date(now.getTime() + istOffset);
      },
    },
    billImg: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DriverExpenseImage",
    },
    paymentMode: {
      type: String,
    },
    lat:{
      type: Number
    },
    long:{
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

const DriverExpense = maintenanceDB.model("DriverExpense", ExpenseSchema);
module.exports = DriverExpense;
