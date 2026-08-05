const mongoose = require("mongoose");
const GodownLorryReceipt = require("../model/GodownLorryReceiptModel");
const { logAction } = require("../utils/logger");

exports.monthlyConsigneeReport = async (req, res) => {
  try {
    const { month, year, consigneeId, status } = req.query;

    if (!month || !year) {
      return res.status(400).json({ message: "month and year are required" });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const matchStage = {
      date: { $gte: startDate, $lte: endDate },
      isDeleted: false,
    };

    if (consigneeId) {
      matchStage.consigneeId = new mongoose.Types.ObjectId(consigneeId);
    }

    if (status) {
      matchStage.status = status;
    }

    const report = await GodownLorryReceipt.aggregate([
      { $match: matchStage },

      // 📦 Products
      { $unwind: "$products" },

      // 📊 Group
      {
        $group: {
          _id: {
            consignorId: "$consignorId",
            consignorName: "$consignorName",
            consigneeId: "$consigneeId",
            consigneeName: "$consigneeName",
            productName: "$products.productName",
            status: "$status",
          },
          totalQuantityKg: { $sum: "$products.quantityKg" },
          totalBags: { $sum: "$products.totalBags" },
        },
      },

      {
        $project: {
          _id: 0,
          consignorId: "$_id.consignorId",
          consignorName: "$_id.consignorName",
          consigneeId: "$_id.consigneeId",
          consigneeName: "$_id.consigneeName",
          productName: "$_id.productName",
          status: "$_id.status",
          totalQuantityKg: 1,
          totalBags: 1,
        },
      },
    ]);

    try {
      await logAction({
        userId: req.user?._id || req.user?.id,
        userType: req.user?.role || 'User',
        action: 'FETCH_REPORT',
        module: 'Report',
        recordId: null,
        oldData: null,
        newData: { month, year, consigneeId, status, reportCount: report.length },
        ipAddress: req.ip,
        userAgent: req.headers ? req.headers['user-agent'] : null,
        apiEndpoint: req.originalUrl,
        requestMethod: req.method,
        status: 'SUCCESS'
      });
    } catch (logError) {
      console.error("Audit log failed for monthlyConsigneeReport:", logError);
    }

    res.status(200).json(report);
  } catch (error) {
    try {
      await logAction({
        userId: req.user?._id || req.user?.id,
        userType: req.user?.role || 'System',
        action: 'FETCH_REPORT',
        module: 'Report',
        recordId: null,
        status: 'FAILED',
        ipAddress: req.ip,
        userAgent: req.headers ? req.headers['user-agent'] : null,
        apiEndpoint: req.originalUrl,
        requestMethod: req.method,
        error: error.message
      });
    } catch (logErr) {}

    res.status(500).json({ message: error.message });
  }
};

