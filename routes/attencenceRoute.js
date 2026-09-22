const express = require('express');
const { markAttendanceByDriver, markAttendanceBySupervisor, getAttendanceHistoryByDriverId, getAttendanceMonthWiseByDriverId, getRemainingAttendenceOfDriversForSupervisor, getAttendanceLocations, getAttendanceImageById, checkoutAttendanceByDriver, getTodayAttendanceById, getAttendanceByTripId } = require('../controller/attendenceController');
const { driverMiddleware } = require('../middleware/driverMiddleware');
const upload = require('../middleware/upload');
const { authenticateToken, authorizeWorkerAction } = require('../middleware/authMiddleware');
const router = express.Router();

// router.get("/attendance/:id", getAttendanceHistory);
router.post("/by-driver", driverMiddleware, upload.single("attendance"), markAttendanceByDriver);
router.get("/mark-by-supervisor/:driverId", authenticateToken, authorizeWorkerAction('masters', 'attendance', 'read'), markAttendanceBySupervisor);
router.get("/get-attendence-history-by-driver-id/:id", authenticateToken, authorizeWorkerAction('masters', 'attendance', 'read'), getAttendanceHistoryByDriverId);
router.get("/get-attendence-month-wise", authenticateToken, authorizeWorkerAction('masters', 'attendance', 'read'), getAttendanceMonthWiseByDriverId);
router.get("/get-remaining-attendence-of-drivers", authenticateToken, authorizeWorkerAction('masters', 'attendance', 'read'), getRemainingAttendenceOfDriversForSupervisor);
router.get("/get-attendance-location", authenticateToken, authorizeWorkerAction('masters', 'attendance', 'read'), getAttendanceLocations);
router.get('/get-attendance-img/:id', authenticateToken, authorizeWorkerAction('masters', 'attendance', 'read'), getAttendanceImageById);


router.patch('/mark-checkout-by-driver/:id',authenticateToken, authorizeWorkerAction('masters', 'attendance', 'update'),checkoutAttendanceByDriver);
router.get('/get-attendance-by-driverid',authenticateToken, authorizeWorkerAction('masters', 'attendance', 'read'),getTodayAttendanceById);
router.get('/get-attendance-by-tripid/:tripId', authenticateToken, authorizeWorkerAction('masters', 'attendance', 'read'), getAttendanceByTripId);


module.exports = router;