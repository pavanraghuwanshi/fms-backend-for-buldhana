const express = require('express');
const { createWorker, workerLogin, updateWorker, deleteWorker, getWorkers, getWorkerProfileImage, getWorkerProfile, saveOrUpdateToken } = require('../controller/workerController');
const { authenticateToken, authorizeWorkerAction } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');
const router = express.Router();

router.post('/login', workerLogin);
router.post('/create', authenticateToken, authorizeWorkerAction('masters', 'employee', 'create'), upload.single('profileImage'), createWorker);
router.get('/get-all', authenticateToken, authorizeWorkerAction('masters', 'employee', 'read'), getWorkers);
router.get('/get-profile-image/:id', authenticateToken, authorizeWorkerAction('masters', 'employee', 'read'), getWorkerProfileImage);
router.get('/get-profile', authenticateToken, authorizeWorkerAction('masters', 'employee', 'read'), getWorkerProfile);
router.patch('/update/:id', authenticateToken, authorizeWorkerAction('masters', 'employee', 'update'), upload.single('profileImage'), updateWorker);
router.delete('/delete/:id', authenticateToken, authorizeWorkerAction('masters', 'employee', 'delete'), deleteWorker);
router.post('/update-fcm', authenticateToken, authorizeWorkerAction('masters', 'employee', 'create'), saveOrUpdateToken);

module.exports = router;
