const express = require("express");
const { authenticateToken } = require("../middleware/authMiddleware");
const { setData, editService, deleteService, getOdometerByVehicleId, getImageById, updateOdometer, getAllServiceLogs, getVehicleStartOdoAndTotalKm } = require("../controller/servicesController");
const router = express.Router();
const upload = require("../middleware/upload");

router.get("/vehicle-odo-distance",authenticateToken,getVehicleStartOdoAndTotalKm);
router.post("/create-service", authenticateToken, upload.fields([{ name: "serviceImg", maxCount: 1 }]), setData );
router.get("/get-services",authenticateToken,getOdometerByVehicleId );
router.get("/get-service-image/:id",authenticateToken,getImageById );
router.get("/get-all-services/",authenticateToken,getAllServiceLogs );
router.patch("/edit-services/:serviceId",authenticateToken, upload.fields([{ name: "serviceImg", maxCount: 1 }]), editService);
router.patch("/edit-odometer/:vehicleId",authenticateToken, updateOdometer);
router.delete("/delete-service/:serviceId",authenticateToken,deleteService);
module.exports = router;
