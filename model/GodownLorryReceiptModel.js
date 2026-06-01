const mongoose = require("mongoose");
const { maintenanceDB } = require("../database/database");
const User = require("../model/userModel");

const GodownLorryReceiptSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    issuedBy: { type: String, required: true },
    receivedBy: { type: String, required: true },

    ownerName: { type: String }, 

    receiptNo: {
  type: String,
},


    // Consignor 
    consignorName: { type: String},
    consignorAddress: { type: String },
    consigneeName: { type: String},
    consigneeAddress: { type: String },

    // Customer
    customerName: { type: String },
    customerAddress: { type: String },

    // Locations
    startLocation: { type: String},
    endLocation: { type: String},

    // Worker / Supervisor

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
        },
    companyId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Company"
         
        },
        consignorId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Consignor"
         
        },
        consigneeId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Consignee"
         
        },
    isDeleted: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["Pending", "Completed", "Cancelled", "In-Progress","Partially Correction"],
      default: "Pending"
    }
,

    // Godown Products
    products: [
      {
warehouseId: {
  type: mongoose.Schema.Types.ObjectId,
  required: function () {
    return (
      this.issuedBy === "Warehouse" ||
      this.receivedBy === "Warehouse"
    );
  }
},
      warehouseName: String,

        productId: { type: mongoose.Schema.Types.ObjectId, ref: "ProductList", required: true },
        productName: String,

        quantityMT: { type: Number, required: true },
        updatedQuantityMT: { type: Number },
         bagSize: { type: Number },
         totalBags: { type: Number },

       
      }
    ],

    // Billing
    customerRate: { type: Number },
    totalAmount: { type: Number },
    transporterRate: { type: Number},
    totalTransporterAmount: { type: Number},
    transporterRateOn: { type: Number},
    customerRateOn: { type: Number},
    customerFreight: { type: Number},
    transporterFreight: { type: Number },
    acknowledgementImage: {
    type: String,
    default: null
  },
  materialOwnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "MaterialOwner"
  },
  },

  { timestamps: true }
);

GodownLorryReceiptSchema.index(
  { receiptNo: 1, companyId: 1 },
  { unique: true }
);

const GodownLorryReceipt = maintenanceDB.model("GodownLorryReceipt", GodownLorryReceiptSchema);
module.exports = GodownLorryReceipt;
