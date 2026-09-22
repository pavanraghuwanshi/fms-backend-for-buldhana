const express = require("express");
const { authenticateToken, authorizeWorkerAction } = require("../middleware/authMiddleware");
const { setData, editService, deleteService, getOdometerByVehicleId, getImageById, updateOdometer, getAllServiceLogs, getVehicleStartOdoAndTotalKm } = require("../controller/servicesController");
const router = express.Router();
const upload = require("../middleware/upload");

router.get("/vehicle-odo-distance",authenticateToken, authorizeWorkerAction('reports', 'serviceLog', 'read'),getVehicleStartOdoAndTotalKm);
router.post("/create-service", authenticateToken, authorizeWorkerAction('reports', 'serviceLog', 'create'), upload.fields([{ name: "serviceImg", maxCount: 1 }]), setData );
router.get("/get-services",authenticateToken, authorizeWorkerAction('reports', 'serviceLog', 'read'),getOdometerByVehicleId );
router.get("/get-service-image/:id",authenticateToken, authorizeWorkerAction('reports', 'serviceLog', 'read'),getImageById );
router.get("/get-all-services/",authenticateToken, authorizeWorkerAction('reports', 'serviceLog', 'read'),getAllServiceLogs );
router.patch("/edit-services/:serviceId",authenticateToken, authorizeWorkerAction('reports', 'serviceLog', 'update'), upload.fields([{ name: "serviceImg", maxCount: 1 }]), editService);
router.patch("/edit-odometer/:vehicleId",authenticateToken, authorizeWorkerAction('reports', 'serviceLog', 'update'), updateOdometer);
router.delete("/delete-service/:serviceId",authenticateToken, authorizeWorkerAction('reports', 'serviceLog', 'delete'),deleteService);
module.exports = router;
