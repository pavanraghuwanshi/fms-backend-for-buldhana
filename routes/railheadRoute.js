const express = require('express');
const router = express.Router();
const controller = require('../controller/railheadController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.post('/create',authenticateToken, controller.createRailhead);
router.get('/get', authenticateToken, controller.getRailheads);
router.get('/get/:id', authenticateToken, controller.getRailheadById);
router.patch('/update/:id', authenticateToken, controller.updateRailhead);
router.delete('/delete/:id', authenticateToken, controller.deleteRailhead);

module.exports = router;
