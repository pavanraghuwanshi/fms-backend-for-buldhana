const mongoose = require("mongoose");
const { maintenanceDB } = require('../database/database');


const lorryReceiptSchema = new mongoose.Schema(
  {
    lorryNumber: { type: Number },
    date: { type: Date },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Device",
    },
    vehicleName: { type: String },
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker",
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
    },
    driverName: { type: String },
    supervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    supervisorName: { type: String },
    ownerName: { type: String },
    consignorName: { type: String },
    consignorAddress: { type: String },
    consigneeName: { type: String },
    consigneeAddress: { type: String },
    customerName: { type: String },
    customerAddress: { type: String },
    startLocation: { type: String, },
    endLocation: { type: String },
    itemName: { type: String },
    sealNumber: { type: String },
    containerNumber: { type: String },
    itemQuantity: { type: Number },
    itemUnit: { type: Number },
    itemWeight: { type: Number },
    itemcost: { type: Number },
    customerRate: { type: Number },
    totalAmount: { type: Number },
    transporterRate: { type: Number },
    totalTransporterAmount: { type: Number },
    transporterRateOn: { type: Number },
    customerRateOn: { type: Number },
    customerFreight: { type: Number },
    transporterFreight: { type: Number }
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

const LorryReceipt = maintenanceDB.model("LorryReceipt", lorryReceiptSchema);
module.exports = LorryReceipt;