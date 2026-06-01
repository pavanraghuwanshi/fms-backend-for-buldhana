const mongoose = require("mongoose");
const { maintenanceDB } = require("../database/database");

const productListSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String },
    unit: { type: String, default: "MT" },

    // supervisor / owner
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    supervisorId: {
      type: mongoose.Schema.Types.ObjectId,
    
    },
  },
  { timestamps: true }
);

module.exports = maintenanceDB.model("ProductList", productListSchema);
