const mongoose = require("mongoose");
const { maintenanceDB } = require("../database/database");

const ledgerSchema = new mongoose.Schema(
  {
    driverId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Driver', 
    required: true, 
    index: true 
  },
    // The account holder (Supervisor who manages these funds)
    supervisorId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true, 
      index: true 
    },


    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'VehicleMaster', default: null },

    // Financial Transaction Details
    type: { 
      type: String, 
      required: true,
      enum: [
        'DEPOSIT', 
        'WITHDRAW', 
      ] 
    },
    amount: { type: Number, required: true }, // Negative for expenses, Positive for deposits
    balanceAfter: { type: Number, required: true }, // The state of the wallet at this exact moment

    // Traceability (Linked to your operational models)
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
    builtyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Builty', required: false },
    expenseId: { type: mongoose.Schema.Types.ObjectId, refPath: 'expenseModel', default: null },
    expenseModel: { type: String, enum: ['DriverExpense', 'Vehicleexpense'], default: null },

    // Metadata
    actionBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date, default: Date.now }
  }, 
  { timestamps: true }
);

// Indexes for fast lookups
ledgerSchema.index({ supervisorId: 1, date: -1 });
ledgerSchema.index({ driverId: 1, date: -1 });
ledgerSchema.index({ vehicleId: 1, date: -1 });

const WalletLedger = maintenanceDB.model("WalletLedger", ledgerSchema);
module.exports = WalletLedger;