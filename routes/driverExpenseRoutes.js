const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload')  // Multer middleware for file uploads
const { addExpense, getAllExpense, updateExpense, deleteExpense, getExpenseByDriverId, getBillImageById, getExpenseByExpenseId } = require('../controller/driverExpenseController');
const { authenticateToken } = require('../middleware/authMiddleware');


router.post('/create', authenticateToken, upload.fields([{ name: 'billImg', maxCount: 1 },]), addExpense);
router.get('/get', authenticateToken, getAllExpense);
router.patch('/update/:id', authenticateToken, upload.fields([{ name: 'billImg', maxCount: 1 },]), updateExpense);
router.delete('/delete/:id', authenticateToken, deleteExpense);

router.get('/get-driver-expense-by-driver-id/:id', authenticateToken, getExpenseByDriverId);
router.get('/bill-img/:id', authenticateToken, getBillImageById);
router.get('/get-driver-expense-by-expense-id/:id', authenticateToken, getExpenseByExpenseId);

module.exports = router;