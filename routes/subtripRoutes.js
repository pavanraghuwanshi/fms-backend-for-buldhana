const express = require("express");
const { createSubtrip, getSubtripByTripId, updateSubtrip, deleteSubtrip } = require("../controller/subTripController");
const { authenticateToken } = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/create", authenticateToken, createSubtrip);
router.get("/get-subtrip-by-trip-id/:id", authenticateToken, getSubtripByTripId);
router.patch("/update/:id", authenticateToken, updateSubtrip);
router.delete("/delete/:id", authenticateToken, deleteSubtrip);

module.exports = router;
