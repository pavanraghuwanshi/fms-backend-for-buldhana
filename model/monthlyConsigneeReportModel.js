const mongoose = require("mongoose");
const { maintenanceDB } = require("../database/database");

const MonthlyConsigneeReportSchema = new mongoose.Schema(
  {
    year: {
      type: Number,
      required: true
    },
    month: {
      type: Number,
      required: true
    },

    consignorName: {
      type: String,
      required: true
    },

    consigneeName: {
      type: String,
      required: true
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductList",
      required: true
    },

    productName: {
      type: String,
      required: true
    },

    totalQuantityKg: {
      type: Number,
      required: true
    },

    totalBags: {
      type: Number,
      required: true
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company"
    }
  },
  { timestamps: true }
);

// Prevent duplicate month entries
MonthlyConsigneeReportSchema.index(
  {
    year: 1,
    month: 1,
    consignorName: 1,
    consigneeName: 1,
    productId: 1
  },
  { unique: true }
);

module.exports = maintenanceDB.model(
  "MonthlyConsigneeReport",
  MonthlyConsigneeReportSchema
);
