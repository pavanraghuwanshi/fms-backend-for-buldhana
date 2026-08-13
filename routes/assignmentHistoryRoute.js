const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/authMiddleware");
const {
  getAssignmentHistory,
  getAssignmentHistoryByVehicleId,
  getAssignmentHistoryByDriverId,
  getAssignmentHistoryByTripId,
} = require("../controller/assignmentHistoryController");

router.get("/", authenticateToken, getAssignmentHistory);
router.get("/vehicle/:vehicleId", authenticateToken, getAssignmentHistoryByVehicleId);
router.get("/driver/:driverId", authenticateToken, getAssignmentHistoryByDriverId);
router.get("/trip/:tripId", authenticateToken, getAssignmentHistoryByTripId);

module.exports = router;
