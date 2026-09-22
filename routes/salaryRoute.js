const express = require("express");
const router = express.Router();
const { authenticateToken, authorizeWorkerAction } = require("../middleware/authMiddleware");
const { createSalary, getDriverSalariesById, updateSalary, deleteSalary, getSalariesByMonth } = require("../controller/salaryController");


router.post("/create/:id", authenticateToken, authorizeWorkerAction('reports', 'salary', 'create'), createSalary);
router.get("/get/:id", authenticateToken, authorizeWorkerAction('reports', 'salary', 'read'), getDriverSalariesById);
router.patch("/update/:id", authenticateToken, authorizeWorkerAction('reports', 'salary', 'update'), updateSalary);
router.delete("/delete/:id", authenticateToken, authorizeWorkerAction('reports', 'salary', 'delete'), deleteSalary);
router.get('/get-by-month/:month', authenticateToken, authorizeWorkerAction('reports', 'salary', 'read'), getSalariesByMonth);


module.exports = router;
