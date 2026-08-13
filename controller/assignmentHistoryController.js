const AssignmentHistory = require("../model/assignmentHistoryModel");
const mongoose = require("mongoose");

exports.getAssignmentHistory = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      vehicleId,
      driverId,
      tripId,
      builtyId,
      action,
      search,
      startDate,
      endDate,
    } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const query = {};

    if (vehicleId) {
      if (mongoose.Types.ObjectId.isValid(vehicleId)) {
        query.vehicleId = vehicleId;
      }
    }

    if (driverId) {
      if (mongoose.Types.ObjectId.isValid(driverId)) {
        query.driverId = driverId;
      }
    }

    if (tripId) {
      if (mongoose.Types.ObjectId.isValid(tripId)) {
        query.tripId = tripId;
      }
    }

    if (builtyId) {
      if (mongoose.Types.ObjectId.isValid(builtyId)) {
        query.builtyId = builtyId;
      }
    }

    if (action && ["ASSIGNED", "UNASSIGNED"].includes(action.toUpperCase())) {
      query.action = action.toUpperCase();
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { vehicleNumber: searchRegex },
        { driverName: searchRegex },
        { reason: searchRegex },
      ];
    }

    const totalRecords = await AssignmentHistory.countDocuments(query);
    const history = await AssignmentHistory.find(query)
      .populate("vehicleId", "vehicleNumber make grossVehicleWeight")
      .populate("driverId", "name contactNumber email")
      .populate("tripId", "tripId startLocation endLocation status")
      .populate("builtyId", "tpNo status")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    return res.status(200).json({
      success: true,
      message: "Assignment history fetched successfully",
      totalRecords,
      totalPages: Math.ceil(totalRecords / limitNum),
      currentPage: pageNum,
      limit: limitNum,
      history,
    });
  } catch (error) {
    console.error("Error in getAssignmentHistory:", error);
    return res.status(500).json({
      success: false,
      message: "Server error: " + error.message,
    });
  }
};

exports.getAssignmentHistoryByVehicleId = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    if (!vehicleId || !mongoose.Types.ObjectId.isValid(vehicleId)) {
      return res.status(400).json({ success: false, message: "Valid Vehicle ID is required" });
    }

    const history = await AssignmentHistory.find({ vehicleId })
      .populate("driverId", "name contactNumber email")
      .populate("tripId", "tripId startLocation endLocation status")
      .populate("builtyId", "tpNo status")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: "Vehicle assignment history fetched successfully",
      count: history.length,
      history,
    });
  } catch (error) {
    console.error("Error in getAssignmentHistoryByVehicleId:", error);
    return res.status(500).json({
      success: false,
      message: "Server error: " + error.message,
    });
  }
};

exports.getAssignmentHistoryByDriverId = async (req, res) => {
  try {
    const { driverId } = req.params;
    if (!driverId || !mongoose.Types.ObjectId.isValid(driverId)) {
      return res.status(400).json({ success: false, message: "Valid Driver ID is required" });
    }

    const history = await AssignmentHistory.find({ driverId })
      .populate("vehicleId", "vehicleNumber make grossVehicleWeight")
      .populate("tripId", "tripId startLocation endLocation status")
      .populate("builtyId", "tpNo status")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: "Driver assignment history fetched successfully",
      count: history.length,
      history,
    });
  } catch (error) {
    console.error("Error in getAssignmentHistoryByDriverId:", error);
    return res.status(500).json({
      success: false,
      message: "Server error: " + error.message,
    });
  }
};

exports.getAssignmentHistoryByTripId = async (req, res) => {
  try {
    const { tripId } = req.params;
    if (!tripId || !mongoose.Types.ObjectId.isValid(tripId)) {
      return res.status(400).json({ success: false, message: "Valid Trip ID is required" });
    }

    const history = await AssignmentHistory.find({ tripId })
      .populate("vehicleId", "vehicleNumber make grossVehicleWeight")
      .populate("driverId", "name contactNumber email")
      .populate("builtyId", "tpNo status")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: "Trip assignment history fetched successfully",
      count: history.length,
      history,
    });
  } catch (error) {
    console.error("Error in getAssignmentHistoryByTripId:", error);
    return res.status(500).json({
      success: false,
      message: "Server error: " + error.message,
    });
  }
};
