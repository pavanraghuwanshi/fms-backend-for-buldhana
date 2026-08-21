const express = require("express");
const router = express.Router();
const {
  createLog,
  deleteLog,
  updateLog,
  getAllLogs,
  updateLogStatus,
  patchVendorLog,
  patchDriverOdometer,
  getLogsByVendorId,
  getLogsByDriverId,
  getSupervisorCreatedLogs,
  getLogsByVendorIdCreatedBySup,
  getFuelPumpLogsByTripId,
  getLogsForLoggedInUser
} = require("../controller/vendorLogController");

const { authenticateToken } = require("../middleware/authMiddleware");
const createUploader = require("../middleware/uploadDiskImg");
const uploadVendorLogs = createUploader("vendorlogs");

router.use(authenticateToken);

router.get("/user-logs", getLogsForLoggedInUser);


router.post("/", uploadVendorLogs.fields([
  { name: "billImgPath", maxCount: 1 },
  { name: "vehicleImgPath", maxCount: 1 },
  { name: "profileImgPaths", maxCount: 5 }
]), createLog);
router.get("/", getAllLogs);
router.get("/fuel-pump/trip/:tripId", getFuelPumpLogsByTripId);
router.get("/fuel-pump/trip", getFuelPumpLogsByTripId);
router.get("/trip/:tripId/fuel-pump", getFuelPumpLogsByTripId);
router.get("/driver/:driverId", getLogsByDriverId);
router.get("/driver", getLogsByDriverId);
router.patch("/driver/odometer/:id", uploadVendorLogs.fields([
  { name: "odometerImgPath", maxCount: 1 }
]), patchDriverOdometer);
router.patch("/update/log/:id", uploadVendorLogs.fields([
  { name: "billImgPath", maxCount: 1 },
  { name: "vehicleImgPath", maxCount: 1 },
  { name: "odometerImgPath", maxCount: 1 },
  { name: "profileImgPaths", maxCount: 5 }
]), patchVendorLog);
router.get("/vendor/:vendorId", getLogsByVendorId);
router.get("/supervisor", getSupervisorCreatedLogs);
router.get("/supervisor-list/by-vendor-id/:vendorId", getLogsByVendorIdCreatedBySup);
router.put("/:id", uploadVendorLogs.fields([
  { name: "billImgPath", maxCount: 1 },
  { name: "vehicleImgPath", maxCount: 1 },
  { name: "profileImgPaths", maxCount: 5 }
]), updateLog);
router.delete("/:id", deleteLog);
router.patch('/logs/status/:id', updateLogStatus);
module.exports = router;