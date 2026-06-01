const express = require('express');
const router = express.Router();
const { startDailyTrip, endDailyTrip, getDailyTrips } = require('../controller/DailyTripByDriver');
const { authenticateToken } = require('../middleware/authMiddleware');

router.post('/tripstartbydriver', authenticateToken, startDailyTrip);
router.patch('/tripendbydriver/:id', authenticateToken, endDailyTrip);
router.get('/tripgetbydriver', authenticateToken, getDailyTrips);


module.exports = router;
