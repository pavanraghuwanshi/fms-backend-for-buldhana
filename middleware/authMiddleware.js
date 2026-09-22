const jwt = require("jsonwebtoken");
const SuperAdmin = require("../model/superadminModel");
const User = require("../model/userModel");
const Driver = require("../model/driverModel");
const { findAuthEntityById } = require("./authHelper");
const WorkerRole = require("../model/WorkerRole");
exports.authenticateToken = async (req, res, next) => {
  try {
    const token = req.headers["authorization"]?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Access token is required" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const role = decoded.role;

    if (role === "superAdmin") {
      req.user = { id: decoded.id, role: "superadmin", users: true };
      return next();
    }
    if (role === "school" || role === "branch" || role === "branchGroup" /* user means supervisor */) {
      const authData = await findAuthEntityById(decoded.id);
      // const user = await User.findById(decoded.id);
      req.user = {
        id: authData.user._id,
        AssignedBranch: authData.user.AssignedBranch,
        role: "user",
        users: authData.user.users,
        username: authData.user.username,
        loginAccess: authData.user.Active,
        roleType: authData.type
      };

      return next();
    }
    if (role === "driver") {
      req.user = { id: decoded.id, supervisor: decoded.supervisor, role: "driver" };
      return next();
    }
    if (role === "worker" || role === "employee") {
      req.user = {
        id: decoded.id,
        role: "worker", // Normalize to worker for downstream compatibility
        supervisor: decoded.supervisor,
        supervisorName: decoded.supervisorName,
      };
      return next();
    }
    if (role === "vendor") {
      req.user = {
        id: decoded.id,

        role: "vendor",
        supervisorId: decoded.supervisorId,     
        supervisorName: decoded.supervisorName  
      };
      return next();
    }
    return res.status(404).json({ message: "User not found" });
  } catch (error) {
    return res.status(403).json({ message: "Invalid token", error: error.message });
  }
};

exports.authorizeWorkerAction = (moduleGroup, moduleName, action, bypassRoles = []) => {
  return async (req, res, next) => {
    try {
      if (bypassRoles.includes(req.user.role)) {
        return next();
      }

      if (req.user.role === "superadmin" || req.user.role === "user") {
        req.supervisorId = req.user.id;
        return next();
      }

      if (req.user.role === "worker" || req.user.role === "employee") {
        const workerRole = await WorkerRole.findOne({ assignedWorkers: req.user.id });
        let hasPermission = false;

        if (workerRole && workerRole.permissions) {
          if (moduleGroup && moduleName && action) {
             hasPermission = workerRole.permissions[moduleGroup]?.[moduleName]?.[action] === true;
          } else if (moduleGroup && !moduleName && action) {
             hasPermission = workerRole.permissions[moduleGroup]?.[action] === true;
          } else if (!moduleGroup && moduleName && action) {
             hasPermission = workerRole.permissions[moduleName]?.[action] === true;
          }
        }

        if (hasPermission) {
          req.supervisorId = req.user.supervisor;
          return next();
        }
      }

      return res.status(403).json({ success: false, message: "Unauthorized access" });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Server error in authorization", error: error.message });
    }
  };
};
