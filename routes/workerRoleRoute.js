const express = require('express');
const router = express.Router();
const {saveWorkerRole, getMyPermissions, getPermissionsByWorkerId, deleteWorkerRole} = require('../controller/workerRoleController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.post(
  '/add/permissions',
  authenticateToken,
  saveWorkerRole
);

router.get('/permissions-for-single-user/:workerId', authenticateToken, getPermissionsByWorkerId);

router.get('/permissions', authenticateToken, getMyPermissions);
router.delete('/delete/permissions/:workerId', authenticateToken, deleteWorkerRole);

module.exports = router;