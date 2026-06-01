const express = require("express");
const router = express.Router();
const { applyLeaveByDriver, updateLeave, getLeaves, deleteLeave, getLeavesForApproval, getPendingLeaveByDriverId, getPendingLeaveForDriver, getApprovedOrRejectedRequestForDriver } = require("../controller/leaveController");
const { driverMiddleware } = require("../middleware/driverMiddleware");
const { authenticateToken } = require("../middleware/authMiddleware");

router.post("/apply", driverMiddleware, applyLeaveByDriver);
router.get("/get", authenticateToken, getLeaves);
router.get("/get/:driverId", authenticateToken, getPendingLeaveByDriverId);
router.get("/get-leaves-for-approval", authenticateToken, getLeavesForApproval);
router.get("/get-pending-leaves-for-driver", authenticateToken, getPendingLeaveForDriver);
router.get("/get-approved-rejected-leaves", authenticateToken, getApprovedOrRejectedRequestForDriver);
router.patch("/update/:leaveId", authenticateToken, updateLeave);
router.delete("/delete/:leaveId", authenticateToken, deleteLeave);

module.exports = router;
