const express = require("express");
const acknowledgementImage = require("../utils/multer/acknowledgementImage");

const { createGodownLorryReceipt, getGodownLorryReceipts, softDeleteGodownLorryReceipt, deleteGodownLorryReceipt, updateLorryReceiptStatus,rejectedByParty, updateAcknowledgementImage } = require("../controller/godownLorryReceiptController");
const { authenticateToken } = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/create", authenticateToken, createGodownLorryReceipt);
router.get("/get", authenticateToken, getGodownLorryReceipts);
router.delete("/softdelete/:id", authenticateToken, softDeleteGodownLorryReceipt);
router.delete("/delete/:id", authenticateToken, deleteGodownLorryReceipt);
router.post("/rejected", authenticateToken, rejectedByParty);

router.patch("/update-status/:id", authenticateToken,acknowledgementImage.single("acknowledgementImage"), updateLorryReceiptStatus);

router.patch("/update-acknowledgement-image/:id",authenticateToken,acknowledgementImage.single("acknowledgementImage"),updateAcknowledgementImage);



module.exports = router;
