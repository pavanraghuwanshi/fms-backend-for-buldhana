const DriverExpenseImage = require("../model/driverExpenseImageModel.js");
const WalletLedger = require("../model/WalletLedger"); 
const DriverExpense = require("../model/driverExpenseModel.js");
const Driver = require("../model/driverModel.js");
const Trip = require("../model/tripModel.js");
const { compressImage } = require("../utils/helperFunctions.js");
const { withdrawFundsForDriver, updateLedgerForAmountChange } = require("./ledgerController.js");
exports.addExpense = async (req, res) => {
  try {
    if (req.user.role !== "driver" && req.user.role !== "user") return res.status(403).json({ success: false, message: "Unauthorized access" });

    const { amount, shopName, location, description, date, paymentMode, lat, long } = req.body;
    let driverId;

    if (req.user.role === "driver") driverId = req.user.id;
    else if (req.user.role === "user") driverId = req.body.driverId;

    if (!driverId) return res.status(400).json({ message: "Driver ID is required" });

    const driver = await Driver.findById(driverId).populate("deviceId", "vehicleNumber");
    if (!driver || !driver?.deviceId) return res.status(400).json({ message: "Driver not found or no assigned vehicle" });

    const billImg = req.files?.["billImg"]?.[0];
    let billImgId = null;

    if (billImg) {
      const mime = billImg.mimetype;

      if (mime.startsWith("image/")) {
        const { base64Data, contentType } = await compressImage(billImg);
        const imgDoc = new DriverExpenseImage({
          base64Data,
          contentType
        });
        await imgDoc.save();
        billImgId = imgDoc._id;
      } else if (mime === "application/pdf") {
        const base64PDF = billImg.buffer.toString("base64");
        const pdfDoc = new DriverExpenseImage({
          base64Data: base64PDF,
          contentType: mime,
        });
        await pdfDoc.save();
        billImgId = pdfDoc._id;
      } else {
        return res.status(400).json({ message: "Only image or PDF files are allowed" });
      }
    }
    const trip = await Trip.findById(driver.currentTripId);
    const providedBuiltyId = req.body.builtyId;
    const activeBuiltyId = providedBuiltyId ||
      trip?.builtyId ||
      (trip?.builtyIds && trip.builtyIds.length > 0 ? trip.builtyIds[trip.builtyIds.length - 1] : null);
    const newExpense = new DriverExpense({
      driverId,
      vehicleId: driver.deviceId._id,
      vehicleName: driver.deviceId.vehicleNumber,
      amount,
      shopName,
      location,
      description,
      date,
      billImg: billImgId,
      paymentMode,
      lat,
      long,
      builtyId: activeBuiltyId
    });

    await newExpense.save();

    await Trip.findByIdAndUpdate(driver.currentTripId, {
      $inc: { spentAmount: amount },
    });
    await handleWalletWithdrawal(req, trip, driver, newExpense);
    return res.status(201).json(newExpense);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: "Error saving expense", error: error.message });
  }
};
const handleWalletWithdrawal = async (req, trip, driver, newExpense) => {
  try {
    const providedBuiltyId = req.body.builtyId;
    const activeBuiltyId = providedBuiltyId ||
      trip?.builtyId ||
      (trip?.builtyIds && trip.builtyIds.length > 0 ? trip.builtyIds[trip.builtyIds.length - 1] : null);

    // 2. Only proceed if payment mode is cash
    if (req.body.paymentMode === "cash") {
      const withdrawalPayload = {
        driverId: newExpense.driverId,
        supervisorId: trip.supervisorId,
        vehicleId: driver.deviceId._id,
        amount: newExpense.amount,
        tripId: driver.currentTripId,
        builtyId: activeBuiltyId,
        actionBy: req.user.id,
        expenseId: newExpense._id
      };

      console.log("Attempting to withdraw funds with payload:", withdrawalPayload);

      // 3. Call the function and await the result
      const result = await withdrawFundsForDriver(withdrawalPayload);

      console.log("Successfully added WalletLedger entry:", result._id);
    } else {
      console.log("Skipping wallet withdrawal: paymentMode is not 'cash'. Current mode:", req.body.paymentMode);
    }
  } catch (error) {
    // 4. If an error occurs (e.g., Insufficient funds or DB failure), log it clearly
    console.error("ERROR: Failed to add WalletLedger entry.");
    console.error("Error Message:", error.message);
  }
};
exports.updateExpense = async (req, res) => {
  try {
    if (req.user.role !== "driver" && req.user.role !== "user") return res.status(403).json({ success: false, message: "Unauthorized access" });

    console.log("Request Body:", req.body);
    console.log("Expense ID from params:", req.params.id);

    const { amount, shopName, location, description, date, paymentMode, lat, long } = req.body;
    let driverId;

    if (req.user.role === "driver") driverId = req.user.id;
    else if (req.user.role === "user") driverId = req.body.driverId;

    if (!driverId) return res.status(400).json({ message: "Driver ID is required" });

    const driver = await Driver.findById(driverId).populate("deviceId", "vehicleNumber");
    if (!driver || !driver?.deviceId) return res.status(400).json({ message: "Driver not found or no assigned vehicle" });

    const existingExpense = await DriverExpense.findById(req.params.id).populate("driverId", "currentTripId");
    if (!existingExpense) return res.status(404).json({ success: false, message: "Expense not found" });

    if (existingExpense.driverId._id.toString() !== driverId.toString()) {
      return res.status(403).json({ message: "Unauthorized: Expense does not belong to the specified driver" });
    }

    let billImgId = existingExpense.billImg;
    const billImg = req.files?.["billImg"]?.[0];

    if (billImg) {
      const mime = billImg.mimetype;
      if (mime.startsWith("image/")) {
        const { base64Data, contentType } = await compressImage(billImg);
        if (billImgId) {
          await DriverExpenseImage.findByIdAndUpdate(billImgId, { base64Data, contentType });
        } else {
          const newImage = new DriverExpenseImage({ base64Data, contentType });
          const savedImg = await newImage.save();
          billImgId = savedImg._id;
        }
      } else if (mime === "application/pdf") {
        const base64PDF = billImg.buffer.toString("base64");
        if (billImgId) {
          await DriverExpenseImage.findByIdAndUpdate(billImgId, { base64Data: base64PDF, contentType: mime });
        } else {
          const pdfDoc = new DriverExpenseImage({ base64Data: base64PDF, contentType: mime });
          await pdfDoc.save();
          billImgId = pdfDoc._id;
        }
      } else {
        return res.status(400).json({ message: "Only image or PDF files are allowed" });
      }
    }

    const updateData = {
      vehicleId: driver.deviceId._id,
      vehicleName: driver.deviceId.vehicleNumber,
      ...(amount !== undefined && { amount }),
      ...(shopName !== undefined && { shopName }),
      ...(location !== undefined && { location }),
      ...(description !== undefined && { description }),
      ...(date !== undefined && { date }),
      ...(paymentMode !== undefined && { paymentMode }),
      ...(lat !== undefined && { lat }),
      ...(long !== undefined && { long }),
      ...(billImgId && { billImg: billImgId }),
    };

    await DriverExpense.findByIdAndUpdate(req.params.id, updateData);

    // --- Ledger Logic with added logs ---
    const newAmount = amount !== undefined ? Number(amount) : undefined;
    const oldAmount = Number(existingExpense.amount || 0);
    const amountDifference = newAmount !== undefined ? newAmount - oldAmount : 0;

    console.log(`[DEBUG] New Amount: ${newAmount}, Old Amount: ${oldAmount}, Diff: ${amountDifference}`);

    if (newAmount !== undefined && amountDifference !== 0) {
      console.log("[DEBUG] Updating Trip and Ledger...");

      await Trip.findByIdAndUpdate(existingExpense.driverId.currentTripId, {
        $inc: { spentAmount: amountDifference },
      });

      try {
        await updateLedgerForAmountChange(req.params.id, newAmount, req.user.id);
        console.log("Ledger updated successfully.");
      } catch (ledgerError) {
        console.warn(`[Ledger Warning] Ledger update failed for Expense ${req.params.id}: ${ledgerError.message}`);
      }
      
    } else {
      console.log("[DEBUG] Ledger update skipped: Amount not changed or not provided.");
    }

    return res.json({ success: true, message: "Expense updated successfully" });
  } catch (error) {
    console.error("Error in updateExpense:", error.message);
    return res.status(500).json({ message: "Error updating expense", error: error.message });
  }
};

exports.deleteExpense = async (req, res) => {
  try {
    if (req.user.role !== "driver" && req.user.role !== "user") return res.status(403).json({ success: false, message: "Unauthorized access" });

    const expense = await DriverExpense.findById(req.params.id).populate("driverId", "currentTripId supervisor");
    if (!expense) return res.status(404).json({ message: "Expense not found" });

    if (req.user.role === "driver" && expense.driverId._id.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: "Unauthorized: Expense does not belong to you" });
    }

    if (req.user.role === "user" && expense.driverId.supervisor?.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: "Unauthorized: Expense does not belong to your driver" });
    }

    if (expense.billImg) await DriverExpenseImage.findByIdAndDelete(expense.billImg);

    // 2. Search for the ledger entry first
    const ledgerEntry = await WalletLedger.findOne({ 
      expenseId: req.params.id, 
      expenseModel: 'DriverExpense' 
    });

    // 3. Delete only if it exists
    if (ledgerEntry) {
      await WalletLedger.deleteOne({ _id: ledgerEntry._id });
      console.log("Ledger entry found and deleted.");
    }

    await Trip.findByIdAndUpdate(expense.driverId.currentTripId, {
      $inc: { spentAmount: -Number(expense.amount || 0) },
    });

    await DriverExpense.findByIdAndDelete(req.params.id);
    return res.json({ message: "Expense deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Error deleting expense", error: error.message });
  }
};

exports.getExpenseByDriverId = async (req, res) => {
  try {
    const driverId = req.params.id;

    if (req.user.role === "driver" && driverId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    if (req.user.role === "user") {
      const driver = await Driver.findOne({ _id: driverId, supervisor: req.user.id });
      if (!driver) return res.status(403).json({ message: "Unauthorized access" });
    }

    const expenses = await DriverExpense.find({ driverId }).populate("driverId", "-_id name ").select("-__v").sort({ createdAt: -1 });

    return res.status(200).json(
      expenses.map((item) => {
        return {
          _id: item._id,
          driverName: item.driverId?.name,
          vehicleName: item.vehicleName,
          amount: item.amount,
          shopName: item.shopName,
          location: item.location,
          description: item.description,
          date: item.date,
          paymentMode: item.paymentMode,
          billImg: item.billImg,
          lat: item.lat,
          long: item.long,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        };
      })
    );
  } catch (error) {
    return res.status(500).json({ message: "Error fetching expenses", error: error.message });
  }
};

exports.getAllExpense = async (req, res) => {
  try {
    if (req.user.role === "superadmin") {
      const expenses = await DriverExpense.find().populate("driverId", "name currentVehicleName supervisor").select("-__v").sort({ createdAt: -1 });
      return res.status(200).json(expenses);
    } else if (req.user.role === "user") {
      const supervisorId = req.user.id;
      const drivers = await Driver.find({ supervisor: supervisorId }).select("_id");
      if (drivers.length === 0) return res.status(404).json({ message: "No driver found." });

      const driverIds = drivers.map((driver) => driver._id);

      const expenses = await DriverExpense.find({ driverId: { $in: driverIds } }).populate("driverId", "name currentVehicleName supervisor").select("-__v").sort({ createdAt: -1 });
      return res.status(200).json(expenses);
    } else if (req.user.role === "driver") {
      const driverId = req.user.id;
      const expenses = await DriverExpense.find({ driverId }).select("amount description createdAt ").sort({ createdAt: -1 });
      return res.status(200).json(expenses);
    } else {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }
  } catch (error) {
    return res.status(500).json({ message: "Error fetching expenses", error: error.message });
  }
};

exports.getBillImageById = async (req, res) => {
  try {
    const imageId = req.params.id;
    const imageDoc = await DriverExpenseImage.findById(imageId).select("-_id");
    if (!imageDoc) return res.status(404).json({ message: "Bill image not found" });
    return res.json(imageDoc);
  } catch (error) {
    return res.status(500).json({ message: "Error retrieving image metadata", error: error.message });
  }
};

exports.getExpenseByExpenseId = async (req, res) => {
  try {
    const expense = await DriverExpense.findById(req.params.id)
      .populate("driverId", "supervisor")
      .select("driverId vehicleName amount shopName location description date paymentMode billImg lat long createdAt updatedAt");

    if (!expense) return res.status(404).json({ message: "Expense not found" });

    if (req.user.role === "driver" && expense.driverId._id.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    if (req.user.role === "user" && expense.driverId.supervisor?.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    return res.status(200).json(expense);
  } catch (error) {
    return res.status(500).json({ message: "Error fetching expense", error: error.message });
  }
};