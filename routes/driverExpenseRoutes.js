const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload')  // Multer middleware for file uploads
const { addExpense, getAllExpense, updateExpense, deleteExpense, getExpenseByDriverId, getBillImageById, getExpenseByExpenseId } = require('../controller/driverExpenseController');
const { authenticateToken, authorizeWorkerAction } = require('../middleware/authMiddleware');


router.post('/create', authenticateToken, authorizeWorkerAction('reports', 'driverExp', 'create'), upload.fields([{ name: 'billImg', maxCount: 1 },]), addExpense);
router.get('/get', authenticateToken, authorizeWorkerAction('reports', 'driverExp', 'read'), getAllExpense);
router.patch('/update/:id', authenticateToken, authorizeWorkerAction('reports', 'driverExp', 'update'), upload.fields([{ name: 'billImg', maxCount: 1 },]), updateExpense);
router.delete('/delete/:id', authenticateToken, authorizeWorkerAction('reports', 'driverExp', 'delete'), deleteExpense);

router.get('/get-driver-expense-by-driver-id/:id', authenticateToken, authorizeWorkerAction('reports', 'driverExp', 'read'), getExpenseByDriverId);
router.get('/bill-img/:id', authenticateToken, authorizeWorkerAction('reports', 'driverExp', 'read'), getBillImageById);
router.get('/get-driver-expense-by-expense-id/:id', authenticateToken, authorizeWorkerAction('reports', 'driverExp', 'read'), getExpenseByExpenseId);

module.exports = router;