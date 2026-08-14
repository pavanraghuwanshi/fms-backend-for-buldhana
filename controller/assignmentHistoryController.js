const AssignmentHistory = require("../model/assignmentHistoryModel");
const VehicleMaster = require("../model/maintenanceDevice.model");
const Driver = require("../model/driverModel");
const Trip = require("../model/tripModel");
const Builty = require("../model/builtyModel");
const User = require("../model/userModel");
const School = require("../model/school");
const Branch = require("../model/branch");
const BranchGroup = require("../model/branchGroup");
const mongoose = require("mongoose");

const roleModelMap = {
  school: "School",
  branch: "Branch",
  branchGroup: "BranchGroup",
  user: "User",
  User: "User",
  School: "School",
  Branch: "Branch",
  BranchGroup: "BranchGroup",
};

/**
 * Validates that provided entity IDs are valid ObjectIds and exist in their respective schemas.
 */
const validateProvidedIds = async ({ vehicleId, driverId, tripId, builtyId }) => {
  if (vehicleId) {
    if (!mongoose.Types.ObjectId.isValid(vehicleId)) {
      return { valid: false, status: 400, message: "Valid Vehicle ID is required" };
    }
    const exists = await VehicleMaster.findById(vehicleId).select("_id").lean();
    if (!exists) {
      return { valid: false, status: 404, message: "Vehicle not found" };
    }
  }

  if (driverId) {
    if (!mongoose.Types.ObjectId.isValid(driverId)) {
      return { valid: false, status: 400, message: "Valid Driver ID is required" };
    }
    const exists = await Driver.findById(driverId).select("_id").lean();
    if (!exists) {
      return { valid: false, status: 404, message: "Driver not found" };
    }
  }

  if (tripId) {
    if (!mongoose.Types.ObjectId.isValid(tripId)) {
      return { valid: false, status: 400, message: "Valid Trip ID is required" };
    }
    const exists = await Trip.findById(tripId).select("_id").lean();
    if (!exists) {
      return { valid: false, status: 404, message: "Trip not found" };
    }
  }

  if (builtyId) {
    if (!mongoose.Types.ObjectId.isValid(builtyId)) {
      return { valid: false, status: 400, message: "Valid Builty ID is required" };
    }
    const exists = await Builty.findById(builtyId).select("_id").lean();
    if (!exists) {
      return { valid: false, status: 404, message: "Builty not found" };
    }
  }

  return { valid: true };
};

/**
 * Safely populates actionBy users from School, Branch, BranchGroup, and User models.
 */
const populateActionByUsers = async (logs) => {
  if (!logs || !logs.length) return logs;

  const schoolIds = new Set();
  const branchIds = new Set();
  const branchGroupIds = new Set();
  const userIds = new Set();
  const unknownIds = new Set();

  logs.forEach((log) => {
    if (
      log.actionBy &&
      (typeof log.actionBy === "string" ||
        (mongoose.Types.ObjectId.isValid(log.actionBy) && !log.actionBy.username))
    ) {
      const idStr = log.actionBy.toString();
      const role = log.actionByRole ? (roleModelMap[log.actionByRole] || log.actionByRole) : null;
      if (role === "School") schoolIds.add(idStr);
      else if (role === "Branch") branchIds.add(idStr);
      else if (role === "BranchGroup") branchGroupIds.add(idStr);
      else if (role === "User") userIds.add(idStr);
      else unknownIds.add(idStr);
    }
  });

  const [schools, branches, branchGroups, users, unknownList] = await Promise.all([
    schoolIds.size > 0
      ? School.find(
          { _id: { $in: Array.from(schoolIds) } },
          "schoolName username email mobileNo role"
        ).lean()
      : [],
    branchIds.size > 0
      ? Branch.find(
          { _id: { $in: Array.from(branchIds) } },
          "branchName username email mobileNo role schoolId"
        ).lean()
      : [],
    branchGroupIds.size > 0
      ? BranchGroup.find(
          { _id: { $in: Array.from(branchGroupIds) } },
          "branchGroupName username email mobileNo role schoolId"
        ).lean()
      : [],
    userIds.size > 0
      ? User.find(
          { _id: { $in: Array.from(userIds) } },
          "custName username email mobile role"
        ).lean()
      : [],
    unknownIds.size > 0
      ? Promise.all([
          School.find(
            { _id: { $in: Array.from(unknownIds) } },
            "schoolName username email mobileNo role"
          ).lean(),
          Branch.find(
            { _id: { $in: Array.from(unknownIds) } },
            "branchName username email mobileNo role schoolId"
          ).lean(),
          BranchGroup.find(
            { _id: { $in: Array.from(unknownIds) } },
            "branchGroupName username email mobileNo role schoolId"
          ).lean(),
          User.find(
            { _id: { $in: Array.from(unknownIds) } },
            "custName username email mobile role"
          ).lean(),
        ]).then(([s, b, bg, u]) => [...s, ...b, ...bg, ...u])
      : [],
  ]);

  const userMap = new Map();
  schools.forEach((s) => userMap.set(s._id.toString(), s));
  branches.forEach((b) => userMap.set(b._id.toString(), b));
  branchGroups.forEach((bg) => userMap.set(bg._id.toString(), bg));
  users.forEach((u) => userMap.set(u._id.toString(), u));
  unknownList.forEach((u) => userMap.set(u._id.toString(), u));

  return logs.map((log) => {
    if (
      log.actionBy &&
      (typeof log.actionBy === "string" ||
        (mongoose.Types.ObjectId.isValid(log.actionBy) && !log.actionBy.username))
    ) {
      const idStr = log.actionBy.toString();
      if (userMap.has(idStr)) {
        log.actionBy = userMap.get(idStr);
      }
    }
    return log;
  });
};

/**
 * Builds standard MongoDB filter query from query parameters.
 */
const buildAssignmentHistoryQuery = async (queryParams, baseQuery = {}) => {
  const {
    vehicleId,
    driverId,
    tripId,
    builtyId,
    action,
    actionBy,
    actionByRole,
    search,
    startDate,
    endDate,
    fromDate,
    toDate,
  } = queryParams || {};

  const query = { ...baseQuery };

  if (vehicleId && mongoose.Types.ObjectId.isValid(vehicleId)) {
    query.vehicleId = vehicleId;
  }

  if (driverId && mongoose.Types.ObjectId.isValid(driverId)) {
    query.driverId = driverId;
  }

  if (tripId && mongoose.Types.ObjectId.isValid(tripId)) {
    query.tripId = tripId;
  }

  if (builtyId && mongoose.Types.ObjectId.isValid(builtyId)) {
    query.builtyId = builtyId;
  }

  if (actionBy && mongoose.Types.ObjectId.isValid(actionBy)) {
    query.actionBy = actionBy;
  }

  if (actionByRole) {
    query.actionByRole = roleModelMap[actionByRole] || actionByRole;
  }

  if (action && ["ASSIGNED", "UNASSIGNED"].includes(action.toUpperCase())) {
    query.action = action.toUpperCase();
  }

  const from = fromDate || startDate;
  const to = toDate || endDate;

  if (from || to) {
    query.createdAt = {};
    if (from) {
      const parsedFrom = new Date(from);
      if (!isNaN(parsedFrom.getTime())) {
        query.createdAt.$gte = parsedFrom;
      }
    }
    if (to) {
      const parsedTo = new Date(to);
      if (!isNaN(parsedTo.getTime())) {
        parsedTo.setHours(23, 59, 59, 999);
        query.createdAt.$lte = parsedTo;
      }
    }
    if (Object.keys(query.createdAt).length === 0) {
      delete query.createdAt;
    }
  }

  const cleanSearch = search?.trim();
  if (cleanSearch) {
    const searchRegex = new RegExp(cleanSearch, "i");

    const [drivers, vehicles, builtys, trips, schools, branches, branchGroups, users] =
      await Promise.all([
        Driver.find({ name: searchRegex }, "_id").lean(),
        VehicleMaster.find(
          { $or: [{ vehicleNumber: searchRegex }, { make: searchRegex }] },
          "_id"
        ).lean(),
        Builty.find(
          { $or: [{ tpNo: searchRegex }, { docNo: searchRegex }] },
          "_id"
        ).lean(),
        Trip.find({ tripId: searchRegex }, "_id").lean(),
        School.find(
          { $or: [{ schoolName: searchRegex }, { username: searchRegex }] },
          "_id"
        ).lean(),
        Branch.find(
          { $or: [{ branchName: searchRegex }, { username: searchRegex }] },
          "_id"
        ).lean(),
        BranchGroup.find(
          { $or: [{ branchGroupName: searchRegex }, { username: searchRegex }] },
          "_id"
        ).lean(),
        User.find(
          { $or: [{ custName: searchRegex }, { username: searchRegex }] },
          "_id"
        ).lean(),
      ]);

    const orConditions = [
      { vehicleNumber: searchRegex },
      { driverName: searchRegex },
      { reason: searchRegex },
    ];

    if (drivers.length) orConditions.push({ driverId: { $in: drivers.map((d) => d._id) } });
    if (vehicles.length) orConditions.push({ vehicleId: { $in: vehicles.map((v) => v._id) } });
    if (builtys.length) orConditions.push({ builtyId: { $in: builtys.map((b) => b._id) } });
    if (trips.length) orConditions.push({ tripId: { $in: trips.map((t) => t._id) } });

    const actionByUsers = [...schools, ...branches, ...branchGroups, ...users];
    if (actionByUsers.length) {
      orConditions.push({ actionBy: { $in: actionByUsers.map((u) => u._id) } });
    }

    query.$or = orConditions;
  }

  return query;
};

/**
 * Executes paginated query and formats response.
 */
const fetchPaginatedAssignmentHistory = async ({
  query,
  queryParams,
  message = "Assignment history fetched successfully",
  res,
}) => {
  const { page = 1, limit = 10 } = queryParams || {};
  const pageNumber = parseInt(page, 10) || 1;
  const limitNumber = parseInt(limit, 10) || 10;
  const skipIndex = (pageNumber - 1) * limitNumber;

  const [logs, total] = await Promise.all([
    AssignmentHistory.find(query)
      .populate("vehicleId", "vehicleNumber make grossVehicleWeight")
      .populate("driverId", "name contactNumber email")
      .populate("tripId", "tripId startLocation endLocation status date")
      .populate("builtyId", "tpNo docNo status")
      .sort({ createdAt: -1 })
      .skip(skipIndex)
      .limit(limitNumber)
      .lean(),
    AssignmentHistory.countDocuments(query),
  ]);

  const populatedLogs = await populateActionByUsers(logs);

  return res.status(200).json({
    success: true,
    message,
    total,
    page: pageNumber,
    limit: limitNumber,
    totalPages: Math.ceil(total / limitNumber),
    count: populatedLogs.length,
    history: populatedLogs,
  });
};

/**
 * GET /assignment-history
 */
exports.getAssignmentHistory = async (req, res) => {
  try {
    const { vehicleId, driverId, tripId, builtyId } = req.query;
    const validation = await validateProvidedIds({ vehicleId, driverId, tripId, builtyId });
    if (!validation.valid) {
      return res.status(validation.status).json({ success: false, message: validation.message });
    }

    const query = await buildAssignmentHistoryQuery(req.query);
    return await fetchPaginatedAssignmentHistory({
      query,
      queryParams: req.query,
      message: "Logs fetched successfully",
      res,
    });
  } catch (error) {
    console.error("Error in getAssignmentHistory:", error);
    return res.status(500).json({
      success: false,
      message: "Server error: " + error.message,
    });
  }
};

/**
 * GET /assignment-history/vehicle/:vehicleId
 */
exports.getAssignmentHistoryByVehicleId = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const validation = await validateProvidedIds({ vehicleId });
    if (!validation.valid) {
      return res.status(validation.status).json({ success: false, message: validation.message });
    }

    const query = await buildAssignmentHistoryQuery(req.query, { vehicleId });
    return await fetchPaginatedAssignmentHistory({
      query,
      queryParams: req.query,
      message: "Vehicle assignment history fetched successfully",
      res,
    });
  } catch (error) {
    console.error("Error in getAssignmentHistoryByVehicleId:", error);
    return res.status(500).json({
      success: false,
      message: "Server error: " + error.message,
    });
  }
};

/**
 * GET /assignment-history/driver/:driverId
 */
exports.getAssignmentHistoryByDriverId = async (req, res) => {
  try {
    const { driverId } = req.params;
    const validation = await validateProvidedIds({ driverId });
    if (!validation.valid) {
      return res.status(validation.status).json({ success: false, message: validation.message });
    }

    const query = await buildAssignmentHistoryQuery(req.query, { driverId });
    return await fetchPaginatedAssignmentHistory({
      query,
      queryParams: req.query,
      message: "Driver assignment history fetched successfully",
      res,
    });
  } catch (error) {
    console.error("Error in getAssignmentHistoryByDriverId:", error);
    return res.status(500).json({
      success: false,
      message: "Server error: " + error.message,
    });
  }
};

/**
 * GET /assignment-history/trip/:tripId
 */
exports.getAssignmentHistoryByTripId = async (req, res) => {
  try {
    const { tripId } = req.params;
    const validation = await validateProvidedIds({ tripId });
    if (!validation.valid) {
      return res.status(validation.status).json({ success: false, message: validation.message });
    }

    const query = await buildAssignmentHistoryQuery(req.query, { tripId });
    return await fetchPaginatedAssignmentHistory({
      query,
      queryParams: req.query,
      message: "Trip assignment history fetched successfully",
      res,
    });
  } catch (error) {
    console.error("Error in getAssignmentHistoryByTripId:", error);
    return res.status(500).json({
      success: false,
      message: "Server error: " + error.message,
    });
  }
};
