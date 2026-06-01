const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/authMiddleware");
const { createSalary, getDriverSalariesById, updateSalary, deleteSalary, getSalariesByMonth } = require("../controller/salaryController");


router.post("/create/:id", authenticateToken, createSalary);
router.get("/get/:id", authenticateToken, getDriverSalariesById);
router.patch("/update/:id", authenticateToken, updateSalary);
router.delete("/delete/:id", authenticateToken, deleteSalary);
router.get('/get-by-month/:month', authenticateToken, getSalariesByMonth);


module.exports = router;
