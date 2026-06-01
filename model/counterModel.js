const mongoose = require("mongoose");
const { maintenanceDB } = require("../database/database");

const counterSchema = new mongoose.Schema({
  name: { type: String, required: true, },
  companyId: { type: mongoose.Schema.Types.ObjectId, required: true },
  seq: { type: Number, default: 0 }
});

counterSchema.index({ name: 1, companyId: 1 }, { unique: true });

module.exports = maintenanceDB.model("Counter", counterSchema);
