const express = require('express');
const router = express.Router();
const { createDailyLog, getAllDailyLogs, updateDailyLog, deleteDailyLog, getDailyLogsMonthWiseByDriverId, getSignatureImageById } = require('../controller/dailyLogController');
const upload = require('../middleware/upload');
const { authenticateToken, authorizeWorkerAction } = require('../middleware/authMiddleware');

router.post('/create', authenticateToken, authorizeWorkerAction('reports', 'dailyLog', 'create'), upload.single("signature"), createDailyLog);
router.get('/get-daily-logs-month-wise', authenticateToken, authorizeWorkerAction('reports', 'dailyLog', 'read'), getDailyLogsMonthWiseByDriverId);
router.get('/get-all-daily-logs', authenticateToken, authorizeWorkerAction('reports', 'dailyLog', 'read'), getAllDailyLogs);
router.get('/get-signature-image/:id', authenticateToken, authorizeWorkerAction('reports', 'dailyLog', 'read'), getSignatureImageById);
router.patch('/update/:id', authenticateToken, authorizeWorkerAction('reports', 'dailyLog', 'update'), upload.single('signature'), updateDailyLog);
router.delete('/delete/:id', authenticateToken, authorizeWorkerAction('reports', 'dailyLog', 'delete'), deleteDailyLog);


module.exports = router;
