const mongoose = require("mongoose");
const { maintenanceDB } = require("../database/database");

const warehouseStockSchema = new mongoose.Schema({
  warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse", required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  
  totalQuantityMT: { type: Number, default: 0 },
  totalBags: { type: Number, default: 0 },
}, { timestamps: true });

const WarehouseStock = maintenanceDB.model("WarehouseStock", warehouseStockSchema);
module.exports = WarehouseStock;
