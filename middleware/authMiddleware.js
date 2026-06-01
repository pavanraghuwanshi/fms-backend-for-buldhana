const jwt = require("jsonwebtoken");
const SuperAdmin = require("../model/superadminModel");
const User = require("../model/userModel");
const Driver = require("../model/driverModel");
const { findAuthEntityById } = require("./authHelper");

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
    if (role === "school"||role === "branch" || role === "branchGroup" /* user means supervisor */) {
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
    if (role === "worker") {
      req.user = {
        id: decoded.id,
        role: "worker",
        supervisor: decoded.supervisor,
        supervisorName: decoded.supervisorName,
      };
      return next();
    }

    console.log(req.user,"ggggggggggggg")

    return res.status(404).json({ message: "User not found" });
  } catch (error) {
    return res.status(403).json({ message: "Invalid token", error: error.message });
  }
};
