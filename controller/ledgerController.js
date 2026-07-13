const WalletLedger = require("../model/WalletLedger");const Builty = require("../model/builtyModel");
const BuiltyCounter = require("../model/builtyCounterModel");
const VehicleMaster = require("../model/maintenanceDevice.model");
const Driver = require("../model/driverModel");
const DriverExpense = require("../model/driverExpenseModel.js");
const Vehicleexpense = require("../model/vehicleExpensesModel.js");
const mongoose = require("mongoose");
exports.addLedgerEntryOnBuiltyAdd = async ({
    driverId, supervisorId, vehicleId, type = "DEPOSIT",
    amount, tripId, builtyId, actionBy, expenseId = null, expenseModel = null
}) => {
    // 1. Get the latest balance
    const lastEntry = await WalletLedger.findOne({ tripId }).sort({ createdAt: -1 });
    const currentBalance = lastEntry ? lastEntry.balanceAfter : 0;
    
    // 2. Validate
    if (currentBalance + amount < 0 && type !== 'DEPOSIT') {
        throw new Error(`Insufficient trip budget: Remaining is ${currentBalance}`);
    }

    // 3. Create entry directly
    const newEntry = new WalletLedger({
        supervisorId, driverId, vehicleId, type, amount,
        balanceAfter: currentBalance + amount,
        tripId, builtyId, expenseId, expenseModel, actionBy,
        date: new Date()
    });

    return await newEntry.save();
};
exports.adjustLedgerEntryOnBuiltyUpdate = async ({ builtyId, newAmount, actionBy }) => {

    const oldEntry = await WalletLedger.findOne({ builtyId }).sort({ createdAt: 1 });
    if (!oldEntry) throw new Error("Original builty entry not found");

    // 2. Calculate the difference (Delta)
    const delta = newAmount - oldEntry.amount;

    // 3. Get the latest record to anchor the new balance
    // Even without a session, this gives us the current state
    const latestEntry = await WalletLedger.findOne().sort({ createdAt: -1 });
    const currentBalance = latestEntry ? latestEntry.balanceAfter : 0;

    // 4. Create the Adjustment entry
    // We do NOT update the old entry (keeps the audit trail clean)
    const adjustmentEntry = new WalletLedger({
        supervisorId: oldEntry.supervisorId,
        driverId: oldEntry.driverId,
        vehicleId: oldEntry.vehicleId,
        tripId: oldEntry.tripId,
        builtyId: oldEntry.builtyId,
        type: 'ADJUSTMENT',
        amount: delta,
        balanceAfter: currentBalance + delta,
        actionBy,
        date: new Date()
    });

    return await adjustmentEntry.save();
};

exports.updateFirstLedgerDeposit = async ({ tripId = null, builtyId, newAmount, actionBy }) => {
    console.log(`[Ledger Service] Starting update for Builty: ${builtyId}`);

    try {
        // 1. Find the entry
        const entry = await WalletLedger.findOne({ 
            builtyId, 
            type: 'DEPOSIT' 
        }).sort({ createdAt: 1 });

        if (!entry) {
            console.error(`[Ledger Service] Deposit entry not found for Builty: ${builtyId}`);
            throw new Error("Deposit entry not found");
        }

        const delta = newAmount - entry.amount;
        console.log(`[Ledger Service] Calculated Delta: ${delta} (New: ${newAmount}, Old: ${entry.amount})`);

        // 2. Update the target entry
        entry.amount = newAmount;
        entry.balanceAfter += delta;
        entry.actionBy = actionBy;
        
        await entry.save();
        console.log(`[Ledger Service] Target entry updated.`);

        // 3. Update subsequent entries that belong to this same Builty
        // NOTE: This will only update records where builtyId matches. 
        // If other expenses exist with the same builtyId, they will be adjusted correctly.
        const result = await WalletLedger.updateMany(
            { 
                builtyId, 
                createdAt: { $gt: entry.createdAt } 
            },
            { $inc: { balanceAfter: delta } }
        );

        console.log(`[Ledger Service] Cascade update complete. Documents modified: ${result.modifiedCount}`);
        return { success: true };

    } catch (error) {
        console.error(`[Ledger Service] Error: ${error.message}`);
        throw error;
    }
};
/**
 * Processes a withdrawal from the trip wallet.
 */
exports.withdrawFundsForVehicle = async ({
    driverId, supervisorId, vehicleId, amount, tripId, builtyId, type = "WITHDRAW", actionBy, expenseModel = "Vehicleexpense", expenseId
}) => {
    const withdrawalAmount = Math.abs(Number(amount));

    // 1. Check if an entry already exists for this specific expenseId (The "Update" Logic)
    const existingEntry = await WalletLedger.findOne({ expenseId, type: "WITHDRAW" });

    if (existingEntry) {
   
        const previousAmount = Math.abs(existingEntry.amount);
        const diff = withdrawalAmount - previousAmount;

        if (diff === 0) return existingEntry;

        // Update the existing entry
        existingEntry.amount = -withdrawalAmount;

        existingEntry.balanceAfter -= diff; 
        
        await existingEntry.save();
        
        // Update all subsequent entries in this trip to maintain balance integrity
        await WalletLedger.updateMany(
            { tripId, createdAt: { $gt: existingEntry.createdAt } },
            { $inc: { balanceAfter: -diff } }
        );

        return existingEntry;
    }

    // 2. Logic for NEW entry (if no existingEntry found)
    const lastEntry = await WalletLedger.findOne({ tripId }).sort({ createdAt: -1 });
    const currentBalance = lastEntry ? lastEntry.balanceAfter : 0;

    if (currentBalance < withdrawalAmount) {
        throw new Error(`Insufficient funds: Current balance is ${currentBalance}, cannot withdraw ${withdrawalAmount}`);
    }

    const withdrawalEntry = new WalletLedger({
        supervisorId,
        driverId,
        vehicleId,
        type: "WITHDRAW",
        amount: -withdrawalAmount,
        balanceAfter: currentBalance - withdrawalAmount,
        tripId,
        builtyId,
        expenseModel,
        expenseId,
        actionBy,
        date: new Date()
    });

    return await withdrawalEntry.save();
};

exports.withdrawFundsForDriver = async ({
    driverId, supervisorId, vehicleId, amount, tripId, builtyId, actionBy, expenseModel = "DriverExpense", expenseId
}) => {
    // 1. Fetch latest balance
    const lastEntry = await WalletLedger.findOne({ tripId })
        .sort({ createdAt: -1 });
    
    const currentBalance = lastEntry ? lastEntry.balanceAfter : 0;
    const withdrawalAmount = Math.abs(Number(amount)); // Ensure it's treated as a positive number for calculation

    // 2. Validate (Optional: block withdrawal if insufficient funds)
    if (currentBalance < withdrawalAmount) {
        throw new Error(`Insufficient funds: Current balance is ${currentBalance}, cannot withdraw ${withdrawalAmount}`);
    }

    // 3. Create the withdrawal entry
    // We store the amount as a negative number to represent a debit/outflow
    const withdrawalEntry = new WalletLedger({
        supervisorId,
        driverId,
        vehicleId,
        type: "WITHDRAW",
        amount: -withdrawalAmount, 
        balanceAfter: currentBalance - withdrawalAmount,
        tripId,
        builtyId,
        expenseModel,
        expenseId,
        actionBy,
        date: new Date()
    });

    return await withdrawalEntry.save();
};

exports.getLedgerSummaryByBuilty = async (builtyId) => {
  try {
    const id = new mongoose.Types.ObjectId(builtyId);

    const result = await WalletLedger.aggregate([
      { $match: { builtyId: id } },
      {
        $group: {
          _id: "$builtyId",
          totalDeposits: {
            $sum: { $cond: [{ $eq: ["$type", "DEPOSIT"] }, "$amount", 0] }
          },
          totalWithdrawals: {
            $sum: { $cond: [{ $eq: ["$type", "WITHDRAW"] }, { $abs: "$amount" }, 0] }
          }
        }
      },
      {
        $project: {
          _id: 0,
          deposite: { $ifNull: ["$totalDeposits", 0] },
          withdraw: { $ifNull: ["$totalWithdrawals", 0] },
          // Using $subtract ensures database-level precision
          netBalance: { 
            $subtract: [
              { $ifNull: ["$totalDeposits", 0] }, 
              { $ifNull: ["$totalWithdrawals", 0] }
            ] 
          }
        }
      }
    ]);

    // 2. Return the first result or the safe default
    return result[0] || { deposite: 0, withdraw: 0, netBalance: 0 };
    
  } catch (error) {
    // 3. Fail-safe: Log the error and return a safe object instead of crashing
    console.error(`[Ledger Error] Failed summary for ${builtyId}:`, error);
    return { deposite: 0, withdraw: 0, netBalance: 0 };
  }
};


/**
 * Fetches ledger entries with polymorphic expense support and optimized pagination.
 * Ensure you have an index on: { builtyId: 1, createdAt: -1 }
 */
exports.getLedgerEntriesByBuilty = async (builtyId, { page = 1, limit = 10, search, type }) => {
  const objectId = new mongoose.Types.ObjectId(builtyId);
  const matchQuery = { builtyId: objectId };
  if (type) matchQuery.type = type;

  const pipeline = [
    { $match: matchQuery },

    // 1. Join Tables
    { $lookup: { from: "drivers", localField: "driverId", foreignField: "_id", as: "driver" } },
    { $unwind: { path: "$driver", preserveNullAndEmptyArrays: true } },
    { $lookup: { from: "vehiclemasters", localField: "vehicleId", foreignField: "_id", as: "vehicle" } },
    { $unwind: { path: "$vehicle", preserveNullAndEmptyArrays: true } },

    // 2. Polymorphic Lookup for Expenses
    {
      $lookup: {
        from: "vehicleexpenses",
        let: { eId: "$expenseId", eModel: "$expenseModel" },
        pipeline: [{ $match: { $expr: { $and: [{ $eq: ["$_id", "$$eId"] }, { $eq: ["$$eModel", "Vehicleexpense"] }] } } }],
        as: "vehExp"
      }
    },
    {
      $lookup: {
        from: "driverexpenses",
        let: { eId: "$expenseId", eModel: "$expenseModel" },
        pipeline: [{ $match: { $expr: { $and: [{ $eq: ["$_id", "$$eId"] }, { $eq: ["$$eModel", "DriverExpense"] }] } } }],
        as: "drvExp"
      }
    },

    // 3. Flatten and Clean Data
    {
      $addFields: {
        expenseData: { $arrayElemAt: [{ $concatArrays: ["$vehExp", "$drvExp"] }, 0] }
      }
    },

    // 4. Search Filter
    ...(search ? [{
      $match: {
        $or: [
          { "driver.name": { $regex: search, $options: "i" } },
          { "vehicle.vehicleNumber": { $regex: search, $options: "i" } }
        ]
      }
    }] : []),

    // 5. Final Projection (The "Clean" Response)
    {
      $project: {
        _id: 1,
        type: 1,
        amount: 1,
        date: 1,
        expenseModel: 1,
        createdAt: 1,
        driver: { _id: 1, name: 1, contactNumber: 1 },
        vehicle: { _id: 1, vehicleNumber: 1 },
        expenseData: {
          $cond: { if: { $eq: ["$expenseData", null] }, then: "$$REMOVE", else: "$expenseData" }
        }
      }
    },
  
  ];

  // Execute
  const [data, totalResult] = await Promise.all([
    WalletLedger.aggregate([...pipeline, { $skip: (Number(page) - 1) * Number(limit) }, { $limit: Number(limit) }]),
    WalletLedger.aggregate([...pipeline, { $count: "total" }])
  ]);

  return {
    entries: data,
    total: totalResult[0]?.total || 0,
    totalPages: Math.ceil((totalResult[0]?.total || 0) / limit)
  };
};