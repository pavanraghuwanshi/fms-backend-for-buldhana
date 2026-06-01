const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const { addExpense, getAllExpenses, getExpenseByDriverId, getExpensesByVehicle, updateExpense, deleteExpense, getExpenseByVehicleId, getBillImageById, getExpenseByExpenseId, getTodayExpensesOfVehicleAndDriver, getCommonBillImage } = require("../controller/vehicleExpenseController");
const { authenticateToken } = require("../middleware/authMiddleware");

// Routes for Expenses
router.post("/create", authenticateToken, upload.fields([{ name: 'billImg', maxCount: 1 },]), addExpense);
router.get("/get", authenticateToken, getAllExpenses);
router.patch('/update/:id', authenticateToken,upload.fields([{ name: 'billImg', maxCount: 1 }]),  updateExpense)
router.delete('/delete/:id', deleteExpense);

router.get("/get-vehicle-expense-by-driver-id/:id", authenticateToken, getExpenseByDriverId);
router.get("/get-vehicle-expense-by-vehicle-id/:id", authenticateToken, getExpenseByVehicleId);
router.get("/vehicle/:vehicleId", authenticateToken, getExpensesByVehicle);
router.get('/bill-img/:id', authenticateToken, getBillImageById);
router.get('/get-vehicle-expense-by-expense-id/:id', authenticateToken, getExpenseByExpenseId);
router.get('/get-today-expense-of-vehicle-and-driver', authenticateToken, getTodayExpensesOfVehicleAndDriver);
router.get("/common-bill-img", authenticateToken, getCommonBillImage);


module.exports = router;
