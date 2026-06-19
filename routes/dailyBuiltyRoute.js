
const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/authMiddleware");
const { createDailyBuilty, getAllDailyBuilty, getDailyBuiltyById, updateDailyBuilty, completeDailyBuilty, cancelDailyBuilty, deleteDailyBuilty } = require("../controller/dailyBuiltyController");

router.post("/", authenticateToken, createDailyBuilty);
router.get("/", authenticateToken, getAllDailyBuilty);
router.get("/:id", authenticateToken, getDailyBuiltyById);
router.put("/:id", authenticateToken, updateDailyBuilty);
router.patch("complete/:id", authenticateToken, completeDailyBuilty);
router.patch("/cancel/:id", authenticateToken, cancelDailyBuilty);
router.delete("/:id", authenticateToken, deleteDailyBuilty);
module.exports = router;
