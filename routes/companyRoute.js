const express = require('express');
const { authenticateToken } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');  // Multer middleware for file uploads
const { createCompany, getCompanies, getCompanyById, updateCompany, deleteCompany, getCompanyDigitalSignature } = require('../controller/companyController');
const router = express.Router();

router.post(
    "/create",
    authenticateToken,
    upload.fields([{ name: "signatureImage", maxCount: 1 }]),
    createCompany
);
router.get("/get-all", authenticateToken, getCompanies);
router.get("/get/:id", authenticateToken, getCompanyById);
router.patch(
    "/update/:id",
    authenticateToken,
    upload.fields([{ name: "signatureImage", maxCount: 1 }]),
    updateCompany
);
router.delete("/delete/:id", authenticateToken, deleteCompany);


router.get("/signatureimage/:id", authenticateToken, getCompanyDigitalSignature);

module.exports = router;
