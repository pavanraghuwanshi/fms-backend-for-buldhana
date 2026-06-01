const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { addInspection, getAllInspections, getInspectionByVehicleId, editInspection, deleteInspection, getInspectionImageById, getInspectionByDriverId } = require("../controller/inspectionController");
const { authenticateToken } = require('../middleware/authMiddleware');

const inspectionUpload = upload.fields([
  { name: "engineOilImg", maxCount: 1 },
  { name: "acCollentImg", maxCount: 1 },
  { name: "breakFluidImg", maxCount: 1 },
  { name: "powerStairingFluidImg", maxCount: 1 },
  { name: "sparkPlugImg", maxCount: 1 },
  { name: "airFilterImg", maxCount: 1 },
  { name: "transmissionFluidImg", maxCount: 1 },
  { name: "windShieldWasherFluidImg", maxCount: 1 },
  { name: "tyrePressureImg", maxCount: 1 },
  { name: "tyreAlignmentImg", maxCount: 1 },
  { name: "batteryChargeImg", maxCount: 1 },
  { name: "wiperBladesImg", maxCount: 1 },
  { name: "suspensionAndStairingImg", maxCount: 1 },
  { name: "underbodyImg", maxCount: 1 },
  { name: "exaustSystemImg", maxCount: 1 },
  { name: "warningLightsImg", maxCount: 1 },
  { name: "headLightsImg", maxCount: 1 },
  { name: "indicatorImg", maxCount: 1 },
]);

router.post("/add-inspection", authenticateToken, inspectionUpload, addInspection);
router.get("/get-all-inspection", authenticateToken, getAllInspections);
router.get("/get-inspection/:vehicleId", authenticateToken, getInspectionByVehicleId);
router.get("/get-inspection-by-driver-id", authenticateToken, getInspectionByDriverId);
router.patch("/edit-inspection/:id", authenticateToken, inspectionUpload, editInspection);
router.delete("/delete-inspection/:id", authenticateToken, deleteInspection);
router.get("/inspection-image/:id", authenticateToken, getInspectionImageById);

module.exports = router;

