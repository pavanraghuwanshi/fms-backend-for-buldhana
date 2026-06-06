const express = require("express");
const router = express.Router();

const builtyInvoiceController = require("../controller/builtyInvoiceController");
const {authenticateToken} = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");



router.post( "/save/:builtyId",authenticateToken, upload.single("invoicePdf"), builtyInvoiceController.createOrReplaceBuiltyInvoice);

router.patch("/invoice/:invoiceId/payment",authenticateToken, builtyInvoiceController.updateInvoicePaymentStatus);

router.get( "/get/:builtyId", authenticateToken, builtyInvoiceController.getBuiltyInvoice);

router.get( "/get-all", authenticateToken, builtyInvoiceController.getAllBuiltyInvoices);

module.exports = router;