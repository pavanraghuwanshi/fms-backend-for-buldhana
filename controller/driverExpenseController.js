const DriverExpenseImage = require("../model/driverExpenseImageModel.js");
const DriverExpense = require("../model/driverExpenseModel.js");
const Driver = require("../model/driverModel.js");
const Trip = require("../model/tripModel.js");
const { compressImage } = require("../utils/helperFunctions.js");

exports.addExpense = async (req, res) => {
  try {
    // Check if the user has a driver or user role
    if (req.user.role !== "driver" && req.user.role !== "user") return res.status(403).json({ success: false, message: "Unauthorized access" });
    const { amount, shopName, location, description, date, paymentMode, lat, long } = req.body;
    let driverId;

    if (req.user.role === "driver") driverId = req.user.id;
    else if (req.user.role === "user") driverId = req.body.driverId;

    if (!driverId) return res.status(400).json({ message: "Driver ID is required" });
    const driver = await Driver.findById(driverId);
    if (!driver || !driver.currentVehicle) return res.status(400).json({ message: "Driver not found or no assigned vehicle" });

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

    const newExpense = new DriverExpense({
      driverId,
      vehicleId: driver.currentVehicle,
      vehicleName: driver.currentVehicleName,
      amount,
      shopName,
      location,
      description,
      date,
      billImg: billImgId,
      paymentMode,
      lat,
      long
    });

    await newExpense.save();
    await Trip.findByIdAndUpdate(driver.currentTripId, { $inc: { spentAmount: amount }, });
    return res.status(201).json(newExpense);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: "Error saving expense", error: error.message });
  }
};

exports.updateExpense = async (req, res) => {
  try {
    if (req.user.role !== "driver" && req.user.role !== "user") return res.status(403).json({ success: false, message: "Unauthorized access" });
    const { amount, shopName, location, description, date, paymentMode } = req.body;
    let driverId;

    if (req.user.role === "driver") driverId = req.user.id;
    else if (req.user.role === "user") driverId = req.body.driverId;
    if (!driverId) return res.status(400).json({ message: "Driver ID is required" });

    const existingExpense = await DriverExpense.findById(req.params.id).populate("driverId", "currentTripId");
    if (!existingExpense) return res.status(404).json({ success: false, message: "Expense not found" });
    if (existingExpense.driverId._id.toString() !== driverId) return res.status(403).json({ message: "Unauthorized: Expense does not belong to the specified driver" });

    let billImgId = existingExpense.billImg;
    const billImg = req.files?.["billImg"]?.[0];

    if (billImg) {
      const { base64Data, contentType } = await compressImage(billImg);

      if (billImgId) {
        // Update existing image document
        await DriverExpenseImage.findByIdAndUpdate(billImgId, {
          base64Data,
          contentType
        });
      } else {
        // No existing image, create new
        const newImage = new DriverExpenseImage({
          base64Data,
          contentType
        });
        const savedImg = await newImage.save();
        billImgId = savedImg._id;
      }
    }

    const updateData = {
      ...(amount && { amount }),
      ...(shopName && { shopName }),
      ...(location && { location }),
      ...(description && { description }),
      ...(date && { date }),
      ...(paymentMode && { paymentMode }),
      ...(billImgId && { billImg: billImgId }),
    };

    await DriverExpense.findByIdAndUpdate(req.params.id, updateData);
    const amountDifference = amount ? amount - existingExpense.amount : 0;
    if (amount && amountDifference !== 0) await Trip.findByIdAndUpdate(existingExpense.driverId.currentTripId, { $inc: { spentAmount: amountDifference } });
    return res.json({ success: true, message: "Expense updated successfully" });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: "Error updating expense", error: error.message });
  }
};

exports.deleteExpense = async (req, res) => {
  try {
    const expense = await DriverExpense.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: "Expense not found" });

    if (expense.billImg) await DriverExpenseImage.findByIdAndDelete(expense.billImg);
    await DriverExpense.findByIdAndDelete(req.params.id);
    return res.json({ message: "Expense deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Error deleting expense", error: error.message });
  }
};

exports.getExpenseByDriverId = async (req, res) => {
  try {
    const driverId = req.params.id;
    const expenses = await DriverExpense.find({ driverId }).populate("driverId", "-_id name ").select("-__v").sort({ createdAt: -1 });
    return res.status(200).json(
      expenses.map((item) => {
        return {
          _id: item._id,
          driverName: item.driverId.name,
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
      const drivers = await Driver.find({ supervisor: supervisorId });
      if (drivers.length === 0) return res.status(404).json({ message: "No driver found." });

      const expenses = await DriverExpense.find({ driverId: { $in: drivers } }).populate("driverId", "name currentVehicleName supervisor").select("-__v").sort({ createdAt: -1 });
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

/* // with pagination
exports.getAllExpense = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    let query = {};
    if (req.user.role === "superadmin") {
      // no additional filters
    } else if (req.user.role === "user") {
      const supervisorId = req.user.id;
      const drivers = await Driver.find({ supervisor: supervisorId }).select("_id");
      if (drivers.length === 0) return res.status(404).json({ message: "No driver found." });
      query.driverId = { $in: drivers.map(d => d._id) };
    } else if (req.user.role === "driver") {
      query.driverId = req.user.id;
    } else {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    const totalCount = await DriverExpense.countDocuments(query);

    const expenses = await DriverExpense.find(query)
      .populate("driverId", "name currentVehicleName")
      .select("-__v")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); // optional: newest first

    return res.status(200).json({
      success: true,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
      expenses,
    });
  } catch (error) {
    return res.status(500).json({ message: "Error fetching expenses", error: error.message });
  }
};
*/

/* // with pagination
exports.getExpenseByDriverId = async (req, res) => {
  try {
    const driverId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const totalCount = await DriverExpense.countDocuments({ driverId });

    const expenses = await DriverExpense.find({ driverId })
      .populate("driverId", "-_id name")
      .select("-__v")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); // optional: newest first

    return res.status(200).json({
      success: true,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
      expenses: expenses.map((item) => ({
        _id: item._id,
        driverName: item.driverId.name,
        vehicleName: item.vehicleName,
        amount: item.amount,
        shopName: item.shopName,
        location: item.location,
        description: item.description,
        date: item.date,
        paymentMode: item.paymentMode,
        billImg: item.billImg,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
    });
  } catch (error) {
    return res.status(500).json({ message: "Error fetching expenses", error: error.message });
  }
};
*/

exports.getBillImageById = async (req, res) => {
  try {
    const imageId = req.params.id;
    const imageDoc = await DriverExpenseImage.findById(imageId).select('-_id');
    if (!imageDoc) return res.status(404).json({ message: "Bill image not found" });
    return res.json(imageDoc);
  } catch (error) {
    return res.status(500).json({ message: "Error retrieving image metadata", error: error.message });
  }
};

exports.getExpenseByExpenseId = async (req, res) => {
  try {
    const expense = await DriverExpense.findById(req.params.id).select("vehicleName amount shopName location description date paymentMode billImg ");
    if (!expense) return res.status(404).json({ message: "Expense not found" });
    return res.status(200).json(expense)
  } catch (error) {
    return res.status(500).json({ message: "Error fetching expense" + error.message });
  }
};