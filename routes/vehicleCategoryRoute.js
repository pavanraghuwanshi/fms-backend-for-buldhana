const express = require("express");
const router = express.Router();

const { createVehicleCategory, getVehicleCategories, getVehicleCategoryById, updateVehicleCategory, deleteVehicleCategory,} = require("../controller/vehicleCategoryController");

const { authenticateToken } = require("../middleware/authMiddleware");

router.post("/", authenticateToken, createVehicleCategory);
router.get("/", authenticateToken, getVehicleCategories);
router.get("/:id", authenticateToken, getVehicleCategoryById);
router.put("/:id", authenticateToken, updateVehicleCategory);
router.delete("/:id", authenticateToken, deleteVehicleCategory);

module.exports = router;