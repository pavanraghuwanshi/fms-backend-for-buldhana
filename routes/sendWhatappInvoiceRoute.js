const express = require("express");
const { authenticateToken } = require("../middleware/authMiddleware");
const { sendInvoiceWhatsapp } = require("../controller/sendInvoiceWhatsappController");
const upload = require("../middleware/upload");

const router = express.Router();
router.post("/", authenticateToken, upload.single("pdf"),sendInvoiceWhatsapp);
module.exports = router;


