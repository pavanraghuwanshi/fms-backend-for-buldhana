const mongoose = require ('mongoose');
const {maintenanceDB} = require ('../database/database');

const roundToTwo = (value) => {
  if (value === null || value === undefined) return value;
  return Number(parseFloat(value).toFixed(2));
};

const railheadSchema = new mongoose.Schema ({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "ProductList", required: true },
     productName: { type: String, required: true },
    quantityMT: { type: Number, required: true,set: roundToTwo },
    bagSize: { type: Number},
    totalBags: { type: Number}, 
     // ✅ Dynamic reference field
  supervisor: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true,
    refPath: 'supervisorModel'
  },

  // ✅ This decides which collection to use
    supervisorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true 
  }
}, { timestamps: true });

railheadSchema.index(
  { productId: 1, supervisorId: 1, bagSize: 1 },
  { unique: true }
);

const Railhead = maintenanceDB.model("Railhead", railheadSchema);
module.exports = Railhead;