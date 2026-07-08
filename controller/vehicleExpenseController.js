const Vehicleexpense = require("../model/vehicleExpensesModel.js");
const Driver = require("../model/driverModel.js");
const Trip = require("../model/tripModel.js");
const { compressImage } = require("../utils/helperFunctions.js");
const Tyre = require("../model/tyre.js");
const TyreBillImage = require("../model/tyreBillImage.js");
const Service = require("../model/serviceModel.js");
const ServiceBillImage = require("../model/serviceImageModel.js");
const DriverExpense = require("../model/driverExpenseModel.js");
const VehicleExpenseImage = require("../model/vehicleExpenseImageModel.js");
const DriverExpenseImage = require("../model/driverExpenseImageModel.js");

exports.addExpense = async (req, res) => {
  try {
    if (req.user.role !== "driver" && req.user.role !== "user") return res.status(403).json({ success: false, message: "Unauthorized access" });
    let driverId;
    const { amount, expenseType, date, vendor, description, paymentMode, location, lat, long } = req.body;

    if (req.user.role === "driver") driverId = req.user.id;
    else if (req.user.role === "user") driverId = req.body.driverId;

    if (!driverId) return res.status(400).json({ message: "Driver ID is required" });
    const driver = await Driver.findById(driverId).populate("deviceId", "vehicleNumber");
    if (!driver || !driver?.deviceId) return res.status(400).json({ message: "Driver not found or no assigned vehicle" });

    const billImg = req.files?.["billImg"]?.[0];
    let billImgId = null;

    if (billImg) {
      const { base64Data, contentType } = await compressImage(billImg);
      const imgDoc = new VehicleExpenseImage({ base64Data, contentType });
      await imgDoc.save();
      billImgId = imgDoc._id;
    }
    const trip = await Trip.findById(driver.currentTripId);
    const expense = new Vehicleexpense({
      driverId,
      vehicleId: driver.deviceId._id,
      vehicleName: driver.deviceId.vehicleNumber,
      amount,
      expenseType,
      date,
      vendor,
      description,
      billImg: billImgId,
      paymentMode,
      location,
      lat,
      long,
      builtyId: trip?.builtyId || null
    });
    await expense.save();
    await Trip.findByIdAndUpdate(driver.currentTripId, { $inc: { spentAmount: amount } });
    return res.status(201).json({ success: true, message: "Expense added successfully", expense });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error adding expense", error: error.message });
  }
};

exports.getAllExpenses = async (req, res) => {
  try {
    if (req.user.role === "superadmin") {
      const { supervisorId } = req.query;
      const query = supervisorId ? { supervisor: supervisorId } : {};

      const drivers = await Driver.find(query);
      if (drivers.length === 0) return res.status(404).json({ message: "No driver found." });

      const expenses = await Vehicleexpense.find({
        driverId: { $in: drivers.map((d) => d._id) },
      })
        .populate("driverId", "name currentVehicleName supervisor deviceId")
        .populate("deviceId", "vehicleNumber")
        .select("-__v")
        .sort({ createdAt: -1 });

      return res.status(200).json(expenses);
    } else if (req.user.role === "user") {
      const supervisorId = req.user.id;

      const drivers = await Driver.find({ supervisor: supervisorId });
      if (drivers.length === 0) {
        return res.status(404).json({ message: "No driver found." });
      }

      const expenses = await Vehicleexpense.find({
        driverId: { $in: drivers.map((d) => d._id) },
      })
        .populate("driverId", "name currentVehicleName supervisor deviceId")
        .populate("deviceId", "vehicleNumber")
        .select("-__v")
        .sort({ createdAt: -1 });

      return res.status(200).json(expenses);
    } else if (req.user.role === "driver") {
      const driverId = req.user.id;

      const expenses = await Vehicleexpense.find({ driverId })
        .populate("deviceId", "vehicleNumber")
        .select("-__v")
        .sort({ createdAt: -1 });

      return res.status(200).json(expenses);
    } else {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching expenses",
      error: error.message,
    });
  }
};

exports.updateExpense = async (req, res) => {
  try {
    if (req.user.role !== "driver" && req.user.role !== "user") {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    let driverId;
    const { amount, expenseType, date, vendor, description, paymentMode, location, lat, long } = req.body;

    if (req.user.role === "driver") driverId = req.user.id;
    else if (req.user.role === "user") driverId = req.body.driverId;

    if (!driverId) {
      return res.status(400).json({ message: "Driver ID is required" });
    }

    const driver = await Driver.findById(driverId).populate("deviceId", "vehicleNumber");
    if (!driver || !driver?.deviceId) {
      return res.status(400).json({ message: "Driver not found or no assigned vehicle" });
    }

    const expense = await Vehicleexpense.findById(req.params.id).populate("driverId", "currentTripId");
    if (!expense) {
      return res.status(404).json({ success: false, message: "Expense not found" });
    }

    if (expense.driverId._id.toString() !== driverId.toString()) {
      return res.status(403).json({
        message: "Unauthorized: Expense does not belong to the specified driver",
      });
    }

    let billImgId = expense.billImg;
    const billImg = req.files?.["billImg"]?.[0];

    if (billImg) {
      const { base64Data, contentType } = await compressImage(billImg);

      if (billImgId) {
        await VehicleExpenseImage.findByIdAndUpdate(billImgId, {
          base64Data,
          contentType,
        });
      } else {
        const newImage = new VehicleExpenseImage({ base64Data, contentType });
        const savedImg = await newImage.save();
        billImgId = savedImg._id;
      }
    }

    const updateData = {
      vehicleId: driver.deviceId._id,
      vehicleName: driver.deviceId.vehicleNumber,
      ...(amount !== undefined && { amount }),
      ...(expenseType !== undefined && { expenseType }),
      ...(date !== undefined && { date }),
      ...(vendor !== undefined && { vendor }),
      ...(description !== undefined && { description }),
      ...(billImgId && { billImg: billImgId }),
      ...(paymentMode !== undefined && { paymentMode }),
      ...(location !== undefined && { location }),
      ...(lat !== undefined && { lat }),
      ...(long !== undefined && { long }),
    };

    const existingExpense = await Vehicleexpense.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: false }
    ).populate("driverId", "currentTripId");

    if (!existingExpense) {
      return res.status(404).json({ success: false, message: "Expense not found" });
    }

    const amountDifference =
      amount !== undefined ? Number(amount) - Number(existingExpense.amount || 0) : 0;

    if (amount !== undefined && amountDifference !== 0) {
      await Trip.findByIdAndUpdate(existingExpense.driverId.currentTripId, {
        $inc: { spentAmount: amountDifference },
      });
    }

    return res.json({
      success: true,
      message: "Expense updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error updating expense",
      error: error.message,
    });
  }
};

exports.deleteExpense = async (req, res) => {
  try {
    const expenseId = req.params.id;

    const deletedExpense = await Vehicleexpense.findById(expenseId);
    if (!deletedExpense) {
      return res.status(404).json({ success: false, message: "Expense not found" });
    }
    const services = await Service.find({ expenseId: deletedExpense._id })
    for (const service of services) {
      if (service.serviceImg) {
        await ServiceBillImage.findByIdAndDelete(service.serviceImg)
      }
    }
    await Service.deleteMany({ expenseId: deletedExpense._id });

    // If type is tyreWheel, delete tyres + tyre bill image
    if (deletedExpense.expenseType === "tyreWheel") {
      const tyres = await Tyre.find({ expenseId: deletedExpense._id });

      for (const tyre of tyres) {
        if (tyre.billImg) {
          await TyreBillImage.findByIdAndDelete(tyre.billImg);
        }
      }

      await Tyre.deleteMany({ expenseId: deletedExpense._id });
    }

    // Delete expense bill image
    if (deletedExpense.billImg) {
      await VehicleExpenseImage.findByIdAndDelete(deletedExpense.billImg);
    }

    // Now finally delete the main expense
    await Vehicleexpense.findByIdAndDelete(expenseId);

    return res.json({ success: true, message: "Expense deleted successfully" });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error deleting expense",
      error: error.message,
    });
  }
};


exports.getExpenseByVehicleId = async (req, res) => {
  try {
    const vehicleId = req.params.id;
    const expenses = await Vehicleexpense.find({
      deviceId: vehicleId
    }).populate("driverId", "-_id name ").select("-__v").sort({ createdAt: -1 });
    if (expenses.length > 0) {
      return res.status(200).json(
        expenses.map((item) => {
          return {
            _id: item._id,
            driverName: item.driverId.name,
            amount: item.amount,
            expenseType: item.expenseType,
            date: item.date,
            vendor: item.vendor,
            description: item.description,
            paymentMode: item.paymentMode,
            billImg: item.billImg,
            location: item.location,
            lat: item.lat,
            long: item.long,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          };
        })
      );
    } else {
      return res.status(404).json({ message: "No expenses found for this vehicle" });
    }
  } catch (error) {
    return res.status(500).json({ message: "Error fetching expenses", error: error.message });
  }
};

exports.getExpenseByDriverId = async (req, res) => {
  try {
    const driverId = req.params.id;
    const expenses = await Vehicleexpense.find({ driverId }).populate("driverId", "-_id name ").select("-billImg -__v");
    if (expenses.length > 0) {
      return res.status(200).json(
        expenses.map((item) => {
          return {
            _id: item._id,
            driverName: item.driverId.name,
            amount: item.amount,
            expenseType: item.expenseType,
            date: item.date,
            vendor: item.vendor,
            description: item.description,
            paymentMode: item.paymentMode,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            location: item.location,
            lat: item.lat,
            long: item.long
          };
        })
      );
    } else {
      return res.status(404).json({ message: "No expenses found for this driver" });
    }
  } catch (error) {
    return res.status(500).json({ message: "Error fetching expenses", error: error.message });
  }
};

exports.getExpensesByVehicle = async (req, res) => {
  try {
    const vehicleId = req.params.vehicleId;
    const expenses = await Vehicleexpense.find({ vehicleId }).sort({ createdAt: -1 }).lean();
    if (expenses.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No expenses found for this vehicle",
      });
    }
    // Convert Buffer to Base64
    expenses.forEach((expense) => {
      expense.documents = expense.documents.map((doc) => ({
        filename: doc.filename,
        contentType: doc.contentType,
        base64: doc.data.toString("base64"),
      }));
    });

    return res.status(200).json({ success: true, expenses });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching expenses",
      error: error.message,
    });
  }
};

exports.getBillImageById = async (req, res) => {
  try {
    const imageId = req.params.id;
    let imageDoc = null;

    // Try finding in VehicleExpenseImage
    imageDoc = await VehicleExpenseImage.findById(imageId).select('-_id');

    // If not found, try in TyreBillImage
    if (!imageDoc) {
      imageDoc = await TyreBillImage.findById(imageId).select('-_id');
    }

    // If still not found, try in ServiceBillImage
    if (!imageDoc) {
      imageDoc = await ServiceBillImage.findById(imageId).select('-_id');
    }

    if (!imageDoc) {
      return res.status(404).json({ message: 'Image not found in any collection' });
    }

    return res.status(200).json(imageDoc);

  } catch (error) {
    return res.status(500).json({
      message: "Error retrieving image metadata",
      error: error.message,
    });
  }
};

exports.getExpenseByExpenseId = async (req, res) => {
  try {
    const expense = await Vehicleexpense.findById(req.params.id).select("vehicleName amount expenseType date vendor description paymentMode billImg location");
    if (!expense) return res.status(404).json({ message: "Expense not found" });
    return res.status(200).json(expense)
  } catch (error) {
    return res.status(500).json({ message: "Error fetching expense" + error.message });
  }
};

exports.getTodayExpensesOfVehicleAndDriver = async (req, res) => {
  try {
    let fromDate = new Date(), toDate = new Date();

    fromDate.setHours(0, 0, 0, 0);
    fromDate = new Date(fromDate.getTime() + 5.5 * 60 * 60 * 1000);
    toDate.setHours(23, 59, 59, 999);
    toDate = new Date(toDate.getTime() + 5.5 * 60 * 60 * 1000);

    const startOfDay = new Date(fromDate);
    const endOfDay = new Date(toDate);

    if (req.user.role === "superadmin") {
      const { supervisorId } = req.query;
      const query = supervisorId ? { supervisor: supervisorId } : {}
      const drivers = await Driver.find(query).select('_id').lean();
      if (drivers.length === 0) return res.status(404).json({ message: "No driver found." });

      const [driverExpenses, vehicleExpenses] = await Promise.all([
        DriverExpense.find(
          {
            driverId: { $in: drivers },
            createdAt: { $gte: startOfDay, $lte: endOfDay }
          }
        ).populate("driverId", " -_id name supervisor").select("-__v -vehicleId -createdAt -updatedAt").sort({ createdAt: -1 }),
        Vehicleexpense.find(
          {
            driverId: { $in: drivers },
            createdAt: { $gte: startOfDay, $lte: endOfDay }
          }
        ).populate("driverId", " -_id name supervisor").select("-__v -vehicleId -createdAt -updatedAt").sort({ createdAt: -1 })
      ]);

      if (driverExpenses.length === 0 && vehicleExpenses.length === 0) return res.status(404).json({ message: "No expenses found for today." });
      return res.status(200).json(vehicleExpenses.concat(driverExpenses));
    } else if (req.user.role === "user") {
      const drivers = await Driver.find({ supervisor: req.user.id }).select('_id').lean();
      if (drivers.length === 0) return res.status(404).json({ message: "No driver found." });

      const [driverExpenses, vehicleExpenses] = await Promise.all([
        DriverExpense.find(
          {
            driverId: { $in: drivers },
            createdAt: { $gte: startOfDay, $lte: endOfDay }
          }
        ).populate("driverId", " -_id name supervisor").select("-__v -vehicleId -createdAt -updatedAt").sort({ createdAt: -1 }),
        Vehicleexpense.find(
          {
            driverId: { $in: drivers },
            createdAt: { $gte: startOfDay, $lte: endOfDay }
          }
        ).populate("driverId", " -_id name supervisor").select("-__v -vehicleId -createdAt -updatedAt").sort({ createdAt: -1 })
      ]);

      if (driverExpenses.length === 0 && vehicleExpenses.length === 0) return res.status(404).json({ message: "No expenses found for today." });
      return res.status(200).json(vehicleExpenses.concat(driverExpenses));
    } else if (req.user.role === "driver") {
      const driverId = req.user.id;
      const [driverExpenses, vehicleExpenses] = await Promise.all([
        DriverExpense.find(
          {
            driverId,
            createdAt: { $gte: startOfDay, $lte: endOfDay }
          }
        ).populate("driverId", " -_id name supervisor").select("-__v -vehicleId -createdAt -updatedAt").sort({ createdAt: -1 }),
        Vehicleexpense.find(
          {
            driverId,
            createdAt: { $gte: startOfDay, $lte: endOfDay }
          }
        ).populate("driverId", " -_id name supervisor").select("-__v -vehicleId -createdAt -updatedAt").sort({ createdAt: -1 })
      ]);

      if (driverExpenses.length === 0 && vehicleExpenses.length === 0) return res.status(404).json({ message: "No expenses found for today." });
      return res.status(200).json(vehicleExpenses.concat(driverExpenses));
    } else {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching expenses",
      error: error.message,
    });
  }
};

exports.getCommonBillImage = async (req, res) => {
  try {
    const { imageId, expenseType } = req.query;

    let imageDoc;
    if (expenseType === "driverExpense") {
      imageDoc = await DriverExpenseImage.findById(imageId);
    }
    else if (expenseType === "vehicleExpense") {
      imageDoc = await VehicleExpenseImage.findById(imageId);
    }
    else return res.status(400).json({ message: "Invalid expenseType. Use 'driver' or 'vehicle'." });
    if (!imageDoc) return res.status(404).json({ message: "Image not found" });

    return res.status(200).json(imageDoc)
  } catch (error) {
    console.error("Error fetching image:", error);
    return res.status(500).json({ message: "Error fetching image", error: error.message });
  }
};
