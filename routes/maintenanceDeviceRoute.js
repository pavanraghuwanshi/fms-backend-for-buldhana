const express = require("express");
const router = express.Router();

const {
  createVehicleMaster,
  getVehicleMasters,
  getVehicleMasterById,
  updateVehicleMaster,
  deleteVehicleMaster,
  getVehicleMasterDropdown
} = require("../controller/maintenanceDeviceController");

const { authenticateToken } = require("../middleware/authMiddleware");

router.post("/", authenticateToken, createVehicleMaster);
router.get("/", authenticateToken, getVehicleMasters);
router.get("/dropdown", authenticateToken, getVehicleMasterDropdown);
router.get("/:id", authenticateToken, getVehicleMasterById);
router.put("/:id", authenticateToken, updateVehicleMaster);
router.delete("/:id", authenticateToken, deleteVehicleMaster);

module.exports = router;