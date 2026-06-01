const express = require('express');
const { markAttendanceByDriver, markAttendanceBySupervisor, getAttendanceHistoryByDriverId, getAttendanceMonthWiseByDriverId, getRemainingAttendenceOfDriversForSupervisor, getAttendanceLocations, getAttendanceImageById, checkoutAttendanceByDriver, getTodayAttendanceById } = require('../controller/attendenceController');
const { driverMiddleware } = require('../middleware/driverMiddleware');
const upload = require('../middleware/upload');
const { authenticateToken } = require('../middleware/authMiddleware');
const router = express.Router();

// router.get("/attendance/:id", getAttendanceHistory);
router.post("/by-driver", driverMiddleware, upload.single("attendance"), markAttendanceByDriver);
router.get("/mark-by-supervisor/:driverId", authenticateToken, markAttendanceBySupervisor);
router.get("/get-attendence-history-by-driver-id/:id", authenticateToken, getAttendanceHistoryByDriverId);
router.get("/get-attendence-month-wise", authenticateToken, getAttendanceMonthWiseByDriverId);
router.get("/get-remaining-attendence-of-drivers", authenticateToken, getRemainingAttendenceOfDriversForSupervisor);
router.get("/get-attendance-location", authenticateToken, getAttendanceLocations);
router.get('/get-attendance-img/:id', authenticateToken, getAttendanceImageById);


router.patch('/mark-checkout-by-driver/:id',authenticateToken,checkoutAttendanceByDriver);
router.get('/get-attendance-by-driverid',authenticateToken,getTodayAttendanceById);


module.exports = router;