const express = require("express");
const router = express.Router();

const { createVehicleCategory, getVehicleCategories, getVehicleCategoryById, updateVehicleCategory, deleteVehicleCategory,} = require("../controller/vehicleCategoryController");

const { authenticateToken, authorizeWorkerAction } = require("../middleware/authMiddleware");

router.post("/", authenticateToken, authorizeWorkerAction('masters', 'category', 'create'), createVehicleCategory);
router.get("/", authenticateToken, authorizeWorkerAction('masters', 'category', 'read'), getVehicleCategories);
router.get("/:id", authenticateToken, authorizeWorkerAction('masters', 'category', 'read'), getVehicleCategoryById);
router.put("/:id", authenticateToken, authorizeWorkerAction('masters', 'category', 'update'), updateVehicleCategory);
router.delete("/:id", authenticateToken, authorizeWorkerAction('masters', 'category', 'delete'), deleteVehicleCategory);

module.exports = router;