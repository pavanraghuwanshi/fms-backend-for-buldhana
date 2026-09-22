const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { addInspection, getAllInspections, getInspectionByVehicleId, editInspection, deleteInspection, getInspectionImageById, getInspectionByDriverId } = require("../controller/inspectionController");
const { authenticateToken, authorizeWorkerAction } = require('../middleware/authMiddleware');

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

router.post("/add-inspection", authenticateToken, authorizeWorkerAction('reports', 'inspection', 'create'), inspectionUpload, addInspection);
router.get("/get-all-inspection", authenticateToken, authorizeWorkerAction('reports', 'inspection', 'read'), getAllInspections);
router.get("/get-inspection/:vehicleId", authenticateToken, authorizeWorkerAction('reports', 'inspection', 'read'), getInspectionByVehicleId);
router.get("/get-inspection-by-driver-id", authenticateToken, authorizeWorkerAction('reports', 'inspection', 'read'), getInspectionByDriverId);
router.patch("/edit-inspection/:id", authenticateToken, authorizeWorkerAction('reports', 'inspection', 'update'), inspectionUpload, editInspection);
router.delete("/delete-inspection/:id", authenticateToken, authorizeWorkerAction('reports', 'inspection', 'delete'), deleteInspection);
router.get("/inspection-image/:id", authenticateToken, authorizeWorkerAction('reports', 'inspection', 'read'), getInspectionImageById);

module.exports = router;

