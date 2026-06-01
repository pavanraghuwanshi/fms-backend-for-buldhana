const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload")
const extendedVehicleController = require("../controller/extendedVehicleController");

router.post("/assign-tyre", extendedVehicleController.assignTyre);
router.delete("/detach-tyre", extendedVehicleController.detachTyre);
router.get("", extendedVehicleController.getAssignedTyres)
router.post("/vehicleDoc/:device_id", upload.array("files"), extendedVehicleController.uploadDocuments)
router.get("/vehicleDoc/:device_id", extendedVehicleController.getDocuments)
router.delete("/vehicleDoc/:deviceId/:documentId", extendedVehicleController.deleteDocument)
// router.put("/vehicleDoc/:deviceId/:documentId", upload.single("file") ,extendedVehicleController.updateDocument)
router.put("/vehicleDoc/:device_id/:document_id", upload.single("file"), extendedVehicleController.updateDocument1)

module.exports = router;