const mongoose = require("mongoose");
const { maintenanceDB } = require("../database/database");

const builtyInvoiceSchema = new mongoose.Schema(
  {
    builtyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Builty",
      required: true,
      index: true,
    },

    invoiceNo: {
      type: String,
      required: true,
      trim: true,
    },

    invoicePdf: {
      filePath: {
        type: String,
        required: true,
      },
      fileName: {
        type: String,
        required: true,
      },
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    },

    totalAmount: {
      type: Number,
      default: 0,
    },

    paidAmount: {
      type: Number,
      default: 0,
    },

    pendingAmount: {
      type: Number,
      default: 0,
    },

    paymentStatus: {
      type: String,
      enum: ["Unpaid", "Partial", "Paid"],
      default: "Unpaid",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    replacedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BuiltyInvoice",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = maintenanceDB.model("BuiltyInvoice", builtyInvoiceSchema);