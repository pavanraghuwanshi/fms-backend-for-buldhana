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

const { authenticateToken, authorizeWorkerAction } = require("../middleware/authMiddleware");

router.post("/", authenticateToken, authorizeWorkerAction('masters', 'vehicle', 'create'), createVehicleMaster);
router.get("/", authenticateToken, authorizeWorkerAction('masters', 'vehicle', 'read'), getVehicleMasters);
router.get("/dropdown", authenticateToken, getVehicleMasterDropdown);
router.get("/dropdownall", authenticateToken, getVehicleMasterDropdownall);
router.patch("/status/:vehicleId", authenticateToken, authorizeWorkerAction('masters', 'vehicle', 'update'), updateVehicleStatus);
router.get("/:id", authenticateToken, authorizeWorkerAction('masters', 'vehicle', 'read'), getVehicleMasterById);
router.put("/:id", authenticateToken, authorizeWorkerAction('masters', 'vehicle', 'update'), updateVehicleMaster);
router.delete("/:id", authenticateToken, authorizeWorkerAction('masters', 'vehicle', 'delete'), deleteVehicleMaster);

module.exports = router;