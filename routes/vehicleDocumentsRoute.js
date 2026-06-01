const express = require('express')
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { addVehicleDocument, updateVehicleDocument, getVehicleDocument, deleteVehicleDocumentImage, getVehicleExpiryDocuments } = require('../controller/vehicleDocumentsController');
const upload = require('../middleware/upload');

router.post("/add", authenticateToken, upload.fields([
    { name: "insuranceImage" },
    { name: "rcImage" },
    { name: "pucImage" },
    { name: "fitnessCertificateImage" }
]), addVehicleDocument);
router.patch("/update/:id", authenticateToken, upload.fields([
    { name: "insuranceImage" },
    { name: "rcImage" },
    { name: "pucImage" },
    { name: "fitnessCertificateImage" }
]), updateVehicleDocument)

router.get("/get", authenticateToken, getVehicleDocument)
router.get("/get-expiring-documents", authenticateToken, getVehicleExpiryDocuments)
router.delete("/delete-image", authenticateToken, deleteVehicleDocumentImage)

module.exports = router;