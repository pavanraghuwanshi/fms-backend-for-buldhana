const mongoose = require('mongoose');
const { maintenanceDB } = require('../database/database');

const roundToTwo = (value) => {
  if (value === null || value === undefined) return value;
  return Number(parseFloat(value).toFixed(2));
};

const warehouseProductSchema = new mongoose.Schema({
  warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse", required: true },

  products: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "ProductList", required: true },
      quantityMT: { type: Number, required: true,set: roundToTwo },
      bagSize: { type: Number},
      totalBags: { type: Number },
      productTotalCountMT: { type: Number,set: roundToTwo },
    }
  ],
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },     // supervisor
    supervisorId: { 
      type: mongoose.Schema.Types.ObjectId, 
      required: true 
    }
}, { timestamps: true });


const WarehouseProduct = maintenanceDB.model("WarehouseProduct", warehouseProductSchema);
module.exports = WarehouseProduct;
