const express = require("express");
const router = express.Router();
const { applyLeaveByDriver, updateLeave, getLeaves, deleteLeave, getLeavesForApproval, getPendingLeaveByDriverId, getPendingLeaveForDriver, getApprovedOrRejectedRequestForDriver } = require("../controller/leaveController");
const { driverMiddleware } = require("../middleware/driverMiddleware");
const { authenticateToken, authorizeWorkerAction } = require("../middleware/authMiddleware");

// Driver app routes (drivers bypass worker checks)
router.post("/apply", driverMiddleware, applyLeaveByDriver);
router.get("/get", authenticateToken, authorizeWorkerAction('masters', 'leave', 'read', ['driver']), getLeaves);
router.get("/get/:driverId", authenticateToken, authorizeWorkerAction('masters', 'leave', 'read', ['driver']), getPendingLeaveByDriverId);

// Superadmin and user app routes (and workers with leave permissions)
router.get("/get-leaves-for-approval", authenticateToken, authorizeWorkerAction('masters', 'leave', 'read', ['driver']), getLeavesForApproval);
router.get("/get-pending-leaves-for-driver", authenticateToken, authorizeWorkerAction('masters', 'leave', 'read', ['driver']), getPendingLeaveForDriver);
router.get("/get-approved-rejected-leaves", authenticateToken, authorizeWorkerAction('masters', 'leave', 'read', ['driver']), getApprovedOrRejectedRequestForDriver);
router.patch("/update/:leaveId", authenticateToken, authorizeWorkerAction('masters', 'leave', 'update'), updateLeave);
router.delete("/delete/:leaveId", authenticateToken, authorizeWorkerAction('masters', 'leave', 'delete'), deleteLeave);

module.exports = router;
