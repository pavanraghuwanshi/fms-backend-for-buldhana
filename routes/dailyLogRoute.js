const express = require('express');
const router = express.Router();
const { createDailyLog, getAllDailyLogs, updateDailyLog, deleteDailyLog, getDailyLogsMonthWiseByDriverId, getSignatureImageById } = require('../controller/dailyLogController');
const upload = require('../middleware/upload');
const { authenticateToken } = require('../middleware/authMiddleware');

router.post('/create', authenticateToken, upload.single("signature"), createDailyLog);
router.get('/get-daily-logs-month-wise', authenticateToken, getDailyLogsMonthWiseByDriverId);
router.get('/get-all-daily-logs', authenticateToken, getAllDailyLogs);
router.get('/get-signature-image/:id', authenticateToken, getSignatureImageById);
router.patch('/update/:id', authenticateToken, upload.single('signature'), updateDailyLog);
router.delete('/delete/:id', authenticateToken, deleteDailyLog);


module.exports = router;
