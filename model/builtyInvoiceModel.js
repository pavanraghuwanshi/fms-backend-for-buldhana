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

    supervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    invoiceNo: {
      type: Number,
      required: true,
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
    partialAmounts: {
      type: [Number],
      default: [],
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

builtyInvoiceSchema.index(
  { supervisorId: 1, invoiceNo: 1 },
  { unique: true }
);

builtyInvoiceSchema.pre("validate", async function (next) {
  try {
    if (!this.isNew || this.invoiceNo) return next();

    const lastInvoice = await this.constructor
      .findOne({ supervisorId: this.supervisorId })
      .sort({ invoiceNo: -1 })
      .select("invoiceNo")
      .lean();

    this.invoiceNo = lastInvoice ? Number(lastInvoice.invoiceNo) + 1 : 1;

    next();
  } catch (error) {
    next(error);
  }
});

module.exports = maintenanceDB.model("BuiltyInvoice", builtyInvoiceSchema);