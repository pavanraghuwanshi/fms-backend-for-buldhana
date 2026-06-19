const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');  // Multer middleware for file uploads
const { createDriver, getAllDrivers, getDriverById, updateDriver, deleteDriver, getDriverDocument, getDriverProfile, getDriverStatus, leaveDashboard, getDriverDropdown, getDriverDropdownall} = require('../controller/driverController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.post('/create', authenticateToken, upload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'licenseImage', maxCount: 1 },
    { name: 'aadharImage', maxCount: 1 },
]), createDriver);
router.get('/all', authenticateToken, getAllDrivers);
router.get('/get-driver-profile', authenticateToken, getDriverProfile);
router.get('/get/:id', authenticateToken, getDriverById);
router.get('/get-driver/status', authenticateToken, getDriverStatus);
router.get('/get-all-driver/dropdown', authenticateToken, getDriverDropdownall);

router.get('/get-driver/dropdown', authenticateToken, getDriverDropdown);

router.patch('/update/:id', authenticateToken, upload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'licenseImage', maxCount: 1 },
    { name: 'aadharImage', maxCount: 1 },
    { name: 'tpImage', maxCount: 1 }
]), updateDriver);

router.delete('/delete/:id', authenticateToken, deleteDriver);
router.get("/get-document", authenticateToken, getDriverDocument);
router.get('/get-leave-dashboard', authenticateToken, leaveDashboard);

module.exports = router;
