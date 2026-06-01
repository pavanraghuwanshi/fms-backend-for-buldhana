const express = require('express')
const router = express.Router();
const { getDevices, getDeviceById } = require('../controller/vehicleController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/get-all', authenticateToken, getDevices);
router.get('/get/:id', authenticateToken, getDeviceById);

module.exports = router;