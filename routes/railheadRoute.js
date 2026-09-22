const express = require('express');
const router = express.Router();
const controller = require('../controller/railheadController');
const { authenticateToken, authorizeWorkerAction } = require('../middleware/authMiddleware');

router.post('/create',authenticateToken, authorizeWorkerAction('warehouse', 'railHead', 'create'), controller.createRailhead);
router.get('/get', authenticateToken, authorizeWorkerAction('warehouse', 'railHead', 'read'), controller.getRailheads);
router.get('/get/:id', authenticateToken, authorizeWorkerAction('warehouse', 'railHead', 'read'), controller.getRailheadById);
router.patch('/update/:id', authenticateToken, authorizeWorkerAction('warehouse', 'railHead', 'update'), controller.updateRailhead);
router.delete('/delete/:id', authenticateToken, authorizeWorkerAction('warehouse', 'railHead', 'delete'), controller.deleteRailhead);

module.exports = router;
