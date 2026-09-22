const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const { addExpense, getAllExpenses, getExpenseByDriverId, getExpensesByVehicle, updateExpense, deleteExpense, getExpenseByVehicleId, getBillImageById, getExpenseByExpenseId, getTodayExpensesOfVehicleAndDriver, getCommonBillImage } = require("../controller/vehicleExpenseController");
const { authenticateToken, authorizeWorkerAction } = require("../middleware/authMiddleware");

// Routes for Expenses
router.post("/create", authenticateToken, authorizeWorkerAction('reports', 'vehicleExp', 'create'), upload.fields([{ name: 'billImg', maxCount: 1 },]), addExpense);
router.get("/get", authenticateToken, authorizeWorkerAction('reports', 'vehicleExp', 'read'), getAllExpenses);
router.patch('/update/:id', authenticateToken, authorizeWorkerAction('reports', 'vehicleExp', 'update'),upload.fields([{ name: 'billImg', maxCount: 1 }]),  updateExpense)
router.delete('/delete/:id', deleteExpense);

router.get("/get-vehicle-expense-by-driver-id/:id", authenticateToken, authorizeWorkerAction('reports', 'vehicleExp', 'delete'), getExpenseByDriverId);
router.get("/get-vehicle-expense-by-vehicle-id/:id", authenticateToken, authorizeWorkerAction('reports', 'vehicleExp', 'read'), getExpenseByVehicleId);
router.get("/vehicle/:vehicleId", authenticateToken, authorizeWorkerAction('reports', 'vehicleExp', 'read'), getExpensesByVehicle);
router.get('/bill-img/:id', authenticateToken, authorizeWorkerAction('reports', 'vehicleExp', 'read'), getBillImageById);
router.get('/get-vehicle-expense-by-expense-id/:id', authenticateToken, authorizeWorkerAction('reports', 'vehicleExp', 'read'), getExpenseByExpenseId);
router.get('/get-today-expense-of-vehicle-and-driver', authenticateToken, authorizeWorkerAction('reports', 'vehicleExp', 'read'), getTodayExpensesOfVehicleAndDriver);
router.get("/common-bill-img", authenticateToken, authorizeWorkerAction('reports', 'vehicleExp', 'read'), getCommonBillImage);


module.exports = router;
