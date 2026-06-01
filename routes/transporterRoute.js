const express = require("express");
const router = express.Router();

const {  createTransporter, getTransporters, getTransporterById, updateTransporter, deleteTransporter,} = require("../controller/transporterController");

const { authenticateToken } = require("../middleware/authMiddleware");

router.post("/", authenticateToken, createTransporter);
router.get("/", authenticateToken, getTransporters);
router.get("/:id", authenticateToken, getTransporterById);
router.put("/:id", authenticateToken, updateTransporter);
router.delete("/:id", authenticateToken, deleteTransporter);

module.exports = router;