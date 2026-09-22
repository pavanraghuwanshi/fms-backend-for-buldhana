const express = require("express");
const router = express.Router();
const { authenticateToken, authorizeWorkerAction } = require("../middleware/authMiddleware");
const { createZone, getAllZones, getZoneDropdown, getZoneById, updateZone, deleteZone,} = require("../controller/zone.controller");

router.post("/", authenticateToken, authorizeWorkerAction('masters', 'zone', 'create'), createZone);
router.get("/", authenticateToken, authorizeWorkerAction('masters', 'zone', 'read'), getAllZones);
router.get("/dropdown", authenticateToken, authorizeWorkerAction('masters', 'zone', 'read'), getZoneDropdown);
router.get("/:id", authenticateToken, authorizeWorkerAction('masters', 'zone', 'read'), getZoneById);
router.put("/:id", authenticateToken, authorizeWorkerAction('masters', 'zone', 'update'), updateZone);
router.delete("/:id", authenticateToken, authorizeWorkerAction('masters', 'zone', 'delete'), deleteZone);

module.exports = router;