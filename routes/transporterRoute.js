const express = require("express");
const router = express.Router();

const {  createTransporter, getTransporters, getTransporterById, updateTransporter, deleteTransporter, getTransporterDropdown,} = require("../controller/transporterController");

const { authenticateToken } = require("../middleware/authMiddleware");

router.post("/", authenticateToken, createTransporter);
router.get("/", authenticateToken, getTransporters);
router.get("/:id", authenticateToken, getTransporterById);
router.put("/:id", authenticateToken, updateTransporter);
router.delete("/:id", authenticateToken, deleteTransporter);
router.get( "/dropdown",  authenticateToken,  getTransporterDropdown);

module.exports = router;