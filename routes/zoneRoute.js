const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/authMiddleware");
const { createZone, getAllZones, getZoneDropdown, getZoneById, updateZone, deleteZone,} = require("../controller/zone.controller");

router.post("/", authenticateToken, createZone);
router.get("/", authenticateToken, getAllZones);
router.get("/dropdown", authenticateToken, getZoneDropdown);
router.get("/:id", authenticateToken, getZoneById);
router.put("/:id", authenticateToken, updateZone);
router.delete("/:id", authenticateToken, deleteZone);

module.exports = router;