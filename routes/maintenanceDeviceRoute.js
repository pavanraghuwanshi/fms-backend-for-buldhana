const express = require("express");
const router = express.Router();

const {
  createVehicleMaster,
  getVehicleMasters,
  getVehicleMasterById,
  updateVehicleMaster,
  deleteVehicleMaster,
  getVehicleMasterDropdown,
  getVehicleMasterDropdownall,
  updateVehicleStatus
} = require("../controller/maintenanceDeviceController");

const { authenticateToken } = require("../middleware/authMiddleware");


router.post("/", authenticateToken, createVehicleMaster);
router.get("/", authenticateToken, getVehicleMasters);
router.get("/dropdown", authenticateToken, getVehicleMasterDropdown);
router.get("/dropdownall", authenticateToken, getVehicleMasterDropdownall);
router.patch("/status/:vehicleId", authenticateToken, updateVehicleStatus);
router.get("/:id", authenticateToken, getVehicleMasterById);
router.put("/:id", authenticateToken, updateVehicleMaster);
router.delete("/:id", authenticateToken, deleteVehicleMaster);

module.exports = router;