const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');  // Multer middleware for file uploads
const { createDriver, getAllDrivers, getDriverById, updateDriver, deleteDriver, getDriverDocument, getDriverProfile, getDriverStatus, leaveDashboard, getDriverDropdown, getDriverDropdownall, getDriverBhattaDays} = require('../controller/driverController');
const { authenticateToken, authorizeWorkerAction } = require('../middleware/authMiddleware');

router.post('/create', authenticateToken, authorizeWorkerAction('masters', 'driver', 'create'), upload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'licenseImage', maxCount: 1 },
    { name: 'aadharImage', maxCount: 1 },
]), createDriver);
router.get('/all', authenticateToken, authorizeWorkerAction('masters', 'driver', 'read'), getAllDrivers);
router.get('/get-driver-profile', authenticateToken, getDriverProfile);
router.get('/get/:id', authenticateToken, authorizeWorkerAction('masters', 'driver', 'read'), getDriverById);
router.get('/get-driver/status', authenticateToken, getDriverStatus);
router.get('/get-all-driver/dropdown', authenticateToken, getDriverDropdownall);
router.get('/bhatta-days', authenticateToken, getDriverBhattaDays);
router.get('/bhatta-days/:driverId', authenticateToken, getDriverBhattaDays);
router.get('/get-driver/dropdown', authenticateToken, getDriverDropdown);

router.patch('/update/:id', authenticateToken, authorizeWorkerAction('masters', 'driver', 'update'), upload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'licenseImage', maxCount: 1 },
    { name: 'aadharImage', maxCount: 1 },
    { name: 'tpImage', maxCount: 1 }
]), updateDriver);

router.delete('/delete/:id', authenticateToken, authorizeWorkerAction('masters', 'driver', 'delete'), deleteDriver);
router.get("/get-document", authenticateToken, getDriverDocument);
router.get('/get-leave-dashboard', authenticateToken, leaveDashboard);

module.exports = router;
