const NotificationPermissions = require("../model/notificationPermissionsSchema");
const School = require("../model/school");
const Branch = require("../model/branch");
const BranchGroup = require("../model/branchGroup");
const mongoose = require("mongoose");

const ALLOWED_SUPERVISOR_MODELS = ["School", "Branch", "BranchGroup"];

// Helper function to check if the user is a superadmin
const checkSuperAdmin = (req, res) => {
  const role = req.user?.role?.toLowerCase();
  if (role !== "superadmin") {
    res.status(403).json({
      success: false,
      message: "Access denied. Only superadmin can perform this action.",
    });
    return false;
  }
  return true;
};

// Helper function to fetch single supervisor details
const fetchSupervisorData = async (supervisorId, supervisorModel) => {
  if (!supervisorId) return null;
  const idStr = supervisorId.toString();

  if (supervisorModel === "School") {
    const s = await School.findById(idStr).select("schoolName username email mobileNo mobile role").lean();
    return s ? { ...s, name: s.schoolName, supervisorModel: "School" } : null;
  }
  if (supervisorModel === "Branch") {
    const b = await Branch.findById(idStr).select("branchName username email mobileNo mobile role schoolId").lean();
    return b ? { ...b, name: b.branchName, supervisorModel: "Branch" } : null;
  }
  if (supervisorModel === "BranchGroup") {
    const bg = await BranchGroup.findById(idStr).select("branchGroupName username email mobileNo mobile role schoolId").lean();
    return bg ? { ...bg, name: bg.branchGroupName, supervisorModel: "BranchGroup" } : null;
  }

  // Fallback search across all 3 models if supervisorModel is omitted
  const [s, b, bg] = await Promise.all([
    School.findById(idStr).select("schoolName username email mobileNo mobile role").lean(),
    Branch.findById(idStr).select("branchName username email mobileNo mobile role schoolId").lean(),
    BranchGroup.findById(idStr).select("branchGroupName username email mobileNo mobile role schoolId").lean(),
  ]);

  if (s) return { ...s, name: s.schoolName, supervisorModel: "School" };
  if (b) return { ...b, name: b.branchName, supervisorModel: "Branch" };
  if (bg) return { ...bg, name: bg.branchGroupName, supervisorModel: "BranchGroup" };

  return null;
};

// Helper function to populate array of permission documents with supervisor name & data
const populatePermissionsList = async (permissionsList) => {
  if (!Array.isArray(permissionsList) || permissionsList.length === 0) return [];

  const schoolIds = [];
  const branchIds = [];
  const branchGroupIds = [];

  permissionsList.forEach((p) => {
    const sId = p.supervisorId?._id || p.supervisorId;
    if (sId) {
      if (p.supervisorModel === "School") schoolIds.push(sId);
      else if (p.supervisorModel === "Branch") branchIds.push(sId);
      else if (p.supervisorModel === "BranchGroup") branchGroupIds.push(sId);
    }
  });

  const [schools, branches, branchGroups] = await Promise.all([
    schoolIds.length ? School.find({ _id: { $in: schoolIds } }).select("schoolName username email mobileNo mobile role").lean() : [],
    branchIds.length ? Branch.find({ _id: { $in: branchIds } }).select("branchName username email mobileNo mobile role schoolId").lean() : [],
    branchGroupIds.length ? BranchGroup.find({ _id: { $in: branchGroupIds } }).select("branchGroupName username email mobileNo mobile role schoolId").lean() : [],
  ]);

  const map = new Map();
  schools.forEach((s) => map.set(`School_${s._id.toString()}`, { ...s, name: s.schoolName, supervisorModel: "School" }));
  branches.forEach((b) => map.set(`Branch_${b._id.toString()}`, { ...b, name: b.branchName, supervisorModel: "Branch" }));
  branchGroups.forEach((bg) => map.set(`BranchGroup_${bg._id.toString()}`, { ...bg, name: bg.branchGroupName, supervisorModel: "BranchGroup" }));

  return permissionsList.map((doc) => {
    const obj = doc.toObject ? doc.toObject() : { ...doc };
    const sId = (obj.supervisorId?._id || obj.supervisorId)?.toString();
    const key = `${obj.supervisorModel}_${sId}`;
    const supervisorData = map.get(key) || null;

    if (supervisorData) {
      obj.supervisorId = {
        _id: supervisorData._id,
        name: supervisorData.name,
        schoolName: supervisorData.schoolName,
        branchName: supervisorData.branchName,
        branchGroupName: supervisorData.branchGroupName,
        username: supervisorData.username,
        email: supervisorData.email,
        mobileNo: supervisorData.mobileNo || supervisorData.mobile || "",
        role: supervisorData.role,
        supervisorModel: supervisorData.supervisorModel,
      };
      obj.supervisor = supervisorData;
    }
    return obj;
  });
};

const roleModelMap = {
  school: "School",
  branch: "Branch",
  branchGroup: "BranchGroup",
};

const applyHierarchy = (req, payload) => {
  const role = req.user?.role;
  const roleType = req.user?.roleType;

  if (role === "user") {
    payload.supervisorId = req.user.id;
    payload.supervisorModel = roleModelMap[roleType];
  }

  if (role === "worker") {
    payload.workerId = req.user.id;
    payload.supervisorId = req.user.supervisor;
    payload.supervisorModel = roleModelMap[roleType] || req.user.supervisorModel;
  }

  return payload;
};

// 1. Create Notification Permissions
exports.createNotificationPermissions = async (req, res) => {
  try {
    const userRole = req.user?.role?.toLowerCase();
    if (!["superadmin", "user", "worker"].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
      });
    }

    const payload = applyHierarchy(req, { ...req.body });

    const {
      supervisorId,
      supervisorModel,
      driver_attendance_notification,
      driver_daily_trip_notification,
      driver_trip_builty_notification,
      driver_expense,
      vehicle_expense,
      vendor_expense,
      vendor_task_update,
      vendor_builty_create_notification,
      vendor_approve_reject_notification,
      worker_builty_create_notification,
      builty_dispatch,
      builty_complete,
      builty_cancel_notification,
    } = payload;

    if (!supervisorId) {
      return res.status(400).json({
        success: false,
        message: "supervisorId is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(supervisorId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid supervisorId format",
      });
    }

    if (!supervisorModel) {
      return res.status(400).json({
        success: false,
        message: "supervisorModel is required",
      });
    }

    if (!ALLOWED_SUPERVISOR_MODELS.includes(supervisorModel)) {
      return res.status(400).json({
        success: false,
        message: "supervisorModel must be one of School, Branch, BranchGroup",
      });
    }

    const existingPermission = await NotificationPermissions.findOne({ supervisorId, supervisorModel });
    if (existingPermission) {
      return res.status(400).json({
        success: false,
        message: "Notification permissions already exist for this supervisor. Please update existing record instead.",
      });
    }

    const permission = await NotificationPermissions.create({
      supervisorId,
      supervisorModel,
      driver_attendance_notification: Boolean(driver_attendance_notification),
      driver_daily_trip_notification: Boolean(driver_daily_trip_notification),
      driver_trip_builty_notification: Boolean(driver_trip_builty_notification),
      driver_expense: Boolean(driver_expense),
      vehicle_expense: Boolean(vehicle_expense),
      vendor_expense: Boolean(vendor_expense),
      vendor_task_update: Boolean(vendor_task_update),
      vendor_builty_create_notification: Boolean(vendor_builty_create_notification),
      vendor_approve_reject_notification: Boolean(vendor_approve_reject_notification),
      worker_builty_create_notification: Boolean(worker_builty_create_notification),
      builty_dispatch: Boolean(builty_dispatch),
      builty_complete: Boolean(builty_complete),
      builty_cancel_notification: Boolean(builty_cancel_notification),
    });

    const populatedList = await populatePermissionsList([permission]);

    return res.status(201).json({
      success: true,
      message: "Notification permissions created successfully",
      data: populatedList[0] || permission,
    });
  } catch (error) {
    console.error("Create Notification Permissions Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// 2. Get All Notification Permissions (with optional pagination & search filtering)
exports.getAllNotificationPermissions = async (req, res) => {
  try {
    const userRole = req.user?.role?.toLowerCase();
    if (!["superadmin", "user", "worker"].includes(userRole)) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    const {
      page = 1,
      limit = 10,
      search,
      status,
      supervisorId,
      supervisorModel,
    } = req.query;

    const filter = {};

    if (userRole === "user") {
      filter.supervisorId = req.user.id;
      if (roleModelMap[req.user.roleType]) {
        filter.supervisorModel = roleModelMap[req.user.roleType];
      }
    } else if (userRole === "worker") {
      filter.supervisorId = req.user.supervisor;
      if (roleModelMap[req.user.roleType] || req.user.supervisorModel) {
        filter.supervisorModel = roleModelMap[req.user.roleType] || req.user.supervisorModel;
      }
    } else {
      if (supervisorId) {
        if (!mongoose.Types.ObjectId.isValid(supervisorId)) {
          return res.status(400).json({
            message: "Invalid supervisorId format",
          });
        }
        filter.supervisorId = supervisorId;
      }

      if (supervisorModel) {
        if (!ALLOWED_SUPERVISOR_MODELS.includes(supervisorModel)) {
          return res.status(400).json({
            message: "supervisorModel must be one of School, Branch, BranchGroup",
          });
        }
        filter.supervisorModel = supervisorModel;
      }
    }

    const rawData = await NotificationPermissions.find(filter).sort({ createdAt: -1 });
    let populatedData = await populatePermissionsList(rawData);

    if (search) {
      const searchRegex = new RegExp(search, "i");
      populatedData = populatedData.filter((item) => {
        const s = item.supervisorId || item.supervisor || {};
        return (
          searchRegex.test(s.name || "") ||
          searchRegex.test(s.schoolName || "") ||
          searchRegex.test(s.branchName || "") ||
          searchRegex.test(s.branchGroupName || "") ||
          searchRegex.test(s.username || "") ||
          searchRegex.test(s.email || "") ||
          searchRegex.test(s.mobileNo || "")
        );
      });
    }

    const total = populatedData.length;
    const skip = (Number(page) - 1) * Number(limit);
    const data = populatedData.slice(skip, skip + Number(limit));

    return res.status(200).json({
      message: "Notification permissions fetched successfully",
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
      data,
    });
  } catch (error) {
    console.error("Get All Notification Permissions Error:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

// 3. Get Notification Permissions by ID
exports.getNotificationPermissionsById = async (req, res) => {
  try {
    const userRole = req.user?.role?.toLowerCase();
    if (!["superadmin", "user", "worker"].includes(userRole)) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid ID format",
      });
    }

    const permission = await NotificationPermissions.findById(id);

    if (!permission) {
      return res.status(404).json({
        message: "Notification permissions not found",
      });
    }

    const populatedList = await populatePermissionsList([permission]);

    return res.status(200).json({
      message: "Notification permissions fetched successfully",
      data: populatedList[0],
    });
  } catch (error) {
    console.error("Get Notification Permissions By ID Error:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

// 4. Get Notification Permissions by Supervisor ID
exports.getNotificationPermissionsBySupervisorId = async (req, res) => {
  try {
    const userRole = req.user?.role?.toLowerCase();
    if (!["superadmin", "user", "worker"].includes(userRole)) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    const { supervisorId } = req.params;
    const { supervisorModel } = req.query;

    if (!mongoose.Types.ObjectId.isValid(supervisorId)) {
      return res.status(400).json({
        message: "Invalid supervisorId format",
      });
    }

    const filter = { supervisorId };
    if (supervisorModel) {
      if (!ALLOWED_SUPERVISOR_MODELS.includes(supervisorModel)) {
        return res.status(400).json({
          message: "supervisorModel must be one of School, Branch, BranchGroup",
        });
      }
      filter.supervisorModel = supervisorModel;
    }

    const permission = await NotificationPermissions.findOne(filter);

    if (!permission) {
      return res.status(404).json({
        message: "Notification permissions not found for this supervisor",
      });
    }

    const populatedList = await populatePermissionsList([permission]);

    return res.status(200).json({
      message: "Notification permissions fetched successfully",
      data: populatedList[0],
    });
  } catch (error) {
    console.error("Get Notification Permissions By Supervisor ID Error:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

// 5. Update Notification Permissions
exports.updateNotificationPermissions = async (req, res) => {
  try {
    const userRole = req.user?.role?.toLowerCase();
    if (!["superadmin", "user", "worker"].includes(userRole)) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    const payload = applyHierarchy(req, { ...req.body });

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid ID format",
      });
    }

    let permission = await NotificationPermissions.findById(id);
    if (!permission) {
      permission = await NotificationPermissions.findOne({ supervisorId: id });
    }

    if (!permission) {
      return res.status(404).json({
        message: "Notification permissions record not found",
      });
    }

    const allowedFields = [
      "driver_attendance_notification",
      "driver_daily_trip_notification",
      "driver_trip_builty_notification",
      "driver_expense",
      "vehicle_expense",
      "vendor_expense",
      "vendor_task_update",
      "vendor_builty_create_notification",
      "vendor_approve_reject_notification",
      "worker_builty_create_notification",
      "builty_dispatch",
      "builty_complete",
      "builty_cancel_notification",
    ];

    allowedFields.forEach((field) => {
      if (payload[field] !== undefined) {
        permission[field] = payload[field];
      }
    });

    if (payload.supervisorId && mongoose.Types.ObjectId.isValid(payload.supervisorId)) {
      permission.supervisorId = payload.supervisorId;
    }

    if (payload.supervisorModel) {
      if (ALLOWED_SUPERVISOR_MODELS.includes(payload.supervisorModel)) {
        permission.supervisorModel = payload.supervisorModel;
      } else {
        return res.status(400).json({
          message: "supervisorModel must be one of School, Branch, BranchGroup",
        });
      }
    }

    await permission.save();

    const populatedList = await populatePermissionsList([permission]);

    return res.status(200).json({
      message: "Notification permissions updated successfully",
      data: populatedList[0],
    });
  } catch (error) {
    console.error("Update Notification Permissions Error:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

// 6. Delete Notification Permissions
exports.deleteNotificationPermissions = async (req, res) => {
  try {
    const userRole = req.user?.role?.toLowerCase();
    if (!["superadmin", "user", "worker"].includes(userRole)) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid ID format",
      });
    }

    let deleted = await NotificationPermissions.findByIdAndDelete(id);
    if (!deleted) {
      deleted = await NotificationPermissions.findOneAndDelete({ supervisorId: id });
    }

    if (!deleted) {
      return res.status(404).json({
        message: "Notification permissions record not found",
      });
    }

    return res.status(200).json({
      message: "Notification permissions deleted successfully",
    });
  } catch (error) {
    console.error("Delete Notification Permissions Error:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

// 7. Get Supervisor List (List of all supervisors from School, Branch, and BranchGroup)
exports.getSupervisorList = async (req, res) => {
  try {
    const userRole = req.user?.role?.toLowerCase();
    if (!["superadmin", "user", "worker"].includes(userRole)) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    const {
      page = 1,
      limit = 10,
      search,
      status,
      supervisorId,
      supervisorModel,
    } = req.query;

    if (supervisorModel && !ALLOWED_SUPERVISOR_MODELS.includes(supervisorModel)) {
      return res.status(400).json({
        message: "supervisorModel must be one of School, Branch, BranchGroup",
      });
    }

    // Fetch supervisors based on model filter
    const fetchSchools = !supervisorModel || supervisorModel === "School";
    const fetchBranches = !supervisorModel || supervisorModel === "Branch";
    const fetchBranchGroups = !supervisorModel || supervisorModel === "BranchGroup";

    const [schools, branches, branchGroups, permissionsList] = await Promise.all([
      fetchSchools ? School.find().select("schoolName username email mobileNo mobile role Active").lean() : [],
      fetchBranches ? Branch.find().select("branchName username email mobileNo mobile role schoolId Active").lean() : [],
      fetchBranchGroups ? BranchGroup.find().select("branchGroupName username email mobileNo mobile role schoolId Active").lean() : [],
      NotificationPermissions.find().lean(),
    ]);

    const permissionsMap = new Map();
    permissionsList.forEach((p) => {
      const sId = p.supervisorId?.toString();
      if (sId && p.supervisorModel) {
        permissionsMap.set(`${p.supervisorModel}_${sId}`, p);
      }
    });

    let supervisors = [
      ...schools.map((s) => ({
        _id: s._id,
        name: s.schoolName,
        schoolName: s.schoolName,
        username: s.username,
        email: s.email,
        mobileNo: s.mobileNo || s.mobile || "",
        role: s.role || "school",
        supervisorModel: "School",
        active: s.Active !== undefined ? s.Active : true,
      })),
      ...branches.map((b) => ({
        _id: b._id,
        name: b.branchName,
        branchName: b.branchName,
        username: b.username,
        email: b.email,
        mobileNo: b.mobileNo || b.mobile || "",
        role: b.role || "branch",
        supervisorModel: "Branch",
        schoolId: b.schoolId,
        active: b.Active !== undefined ? b.Active : true,
      })),
      ...branchGroups.map((bg) => ({
        _id: bg._id,
        name: bg.branchGroupName,
        branchGroupName: bg.branchGroupName,
        username: bg.username,
        email: bg.email,
        mobileNo: bg.mobileNo || bg.mobile || "",
        role: bg.role || "branchGroup",
        supervisorModel: "BranchGroup",
        schoolId: bg.schoolId,
        active: bg.Active !== undefined ? bg.Active : true,
      })),
    ];

    if (supervisorId) {
      supervisors = supervisors.filter((s) => s._id.toString() === supervisorId.toString());
    }

    if (status) {
      const statusBool = status === "true" || status === "Active" || status === true;
      supervisors = supervisors.filter((s) => s.active === statusBool);
    }

    supervisors = supervisors.map((sup) => {
      const perm = permissionsMap.get(`${sup.supervisorModel}_${sup._id.toString()}`);
      return {
        ...sup,
        hasNotificationPermissions: Boolean(perm),
        notificationPermissions: perm || null,
      };
    });

    if (search) {
      const searchRegex = new RegExp(search, "i");
      supervisors = supervisors.filter(
        (s) =>
          searchRegex.test(s.name || "") ||
          searchRegex.test(s.username || "") ||
          searchRegex.test(s.email || "") ||
          searchRegex.test(s.mobileNo || "")
      );
    }

    const total = supervisors.length;
    const skip = (Number(page) - 1) * Number(limit);
    const data = supervisors.slice(skip, skip + Number(limit));

    return res.status(200).json({
      message: "Supervisor data fetched successfully",
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
      data,
    });
  } catch (error) {
    console.error("Get Supervisor List Error:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};
