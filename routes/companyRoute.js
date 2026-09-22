const express = require('express');
const { authenticateToken, authorizeWorkerAction } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');  // Multer middleware for file uploads
const { createCompany, getCompanies, getCompanyById, updateCompany, deleteCompany, getCompanyDigitalSignature } = require('../controller/companyController');
const router = express.Router();

router.post(
    "/create",
    authenticateToken, authorizeWorkerAction('masters', 'company', 'create'),
    upload.fields([{ name: "signatureImage", maxCount: 1 }]),
    createCompany
);
router.get("/get-all", authenticateToken, authorizeWorkerAction('masters', 'company', 'read'), getCompanies);
router.get("/get/:id", authenticateToken, authorizeWorkerAction('masters', 'company', 'read'), getCompanyById);
router.patch(
    "/update/:id",
    authenticateToken, authorizeWorkerAction('masters', 'company', 'update'),
    upload.fields([{ name: "signatureImage", maxCount: 1 }]),
    updateCompany
);
router.delete("/delete/:id", authenticateToken, authorizeWorkerAction('masters', 'company', 'delete'), deleteCompany);


router.get("/signatureimage/:id", authenticateToken, authorizeWorkerAction('masters', 'company', 'read'), getCompanyDigitalSignature);

module.exports = router;
