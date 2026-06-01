const express = require('express');
const { createWorker, workerLogin, updateWorker, deleteWorker, getWorkers, getWorkerProfileImage, getWorkerProfile } = require('../controller/workerController');
const { authenticateToken } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');
const router = express.Router();

router.post('/login', workerLogin);
router.post('/create', authenticateToken, upload.single('profileImage'), createWorker);
router.get('/get-all', authenticateToken, getWorkers);
router.get('/get-profile-image/:id', authenticateToken, getWorkerProfileImage);
router.get('/get-profile', authenticateToken, getWorkerProfile);
router.patch('/update/:id', authenticateToken, upload.single('profileImage'), updateWorker);
router.delete('/delete/:id', authenticateToken, deleteWorker);

module.exports = router;
