const express = require('express');
const router = express.Router();
const {getNumberData, getAvailableUnavailableVehicles} = require("../controller/dashboardController")
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/get-all-data', authenticateToken, getNumberData);
router.get('/get-available-unavailable-vehicles', authenticateToken, getAvailableUnavailableVehicles);

module.exports = router;