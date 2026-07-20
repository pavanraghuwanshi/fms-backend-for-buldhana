const express = require("express");
const { createTrip, getAllTrips, updateTrip, deleteTrip, getTripByVehicleId, getTripByDriverId, getTripAnalyticsByTripId, tripCheckIn, getDutySlipByTripId, getAllTripswithPegination, getInProgressTrips, getTripsForDropdown, getDriverLedgerHistory } = require("../controller/tripController");
const { authenticateToken } = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/create", authenticateToken, createTrip);
router.post("/check-in", authenticateToken, tripCheckIn);
router.get("/get", authenticateToken, getAllTrips);
router.get("/get-with-pagination", authenticateToken, getAllTripswithPegination);
router.get("/dropdown-for-all-trips", authenticateToken, getTripsForDropdown);
router.get("/driver-ledger/:driverId", authenticateToken, getDriverLedgerHistory);

router.get("/get-in-progress", authenticateToken, getInProgressTrips);
router.get("/get-dutySlip-by-trip-id/:id", authenticateToken, getDutySlipByTripId);
router.get("/get-trip-by-vehicle-id/:id", authenticateToken, getTripByVehicleId);
router.get("/get-trip-by-driver-id/:id", authenticateToken, getTripByDriverId);
router.get("/get-trip-analytics-by-trip-id/:id", authenticateToken, getTripAnalyticsByTripId);
router.patch("/update/:tripId", authenticateToken, updateTrip);
router.delete("/delete/:tripId", authenticateToken, deleteTrip);

module.exports = router;
