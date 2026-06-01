const mongoose = require("mongoose");
const { maintenanceDB } = require("../database/database");

const warehouseSchema = new mongoose.Schema(
  {
    wareHouseName: { type: String, required: true },
    location: { type: String },

    // 👑 Owner / Supervisor
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // 🧾 Audit field
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = maintenanceDB.model("Warehouse", warehouseSchema);
