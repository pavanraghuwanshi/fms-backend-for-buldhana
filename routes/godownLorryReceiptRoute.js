const express = require("express");
const acknowledgementImage = require("../utils/multer/acknowledgementImage");

const { createGodownLorryReceipt, getGodownLorryReceipts, softDeleteGodownLorryReceipt, deleteGodownLorryReceipt, updateLorryReceiptStatus,rejectedByParty, updateAcknowledgementImage } = require("../controller/godownLorryReceiptController");
const { authenticateToken, authorizeWorkerAction } = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/create", authenticateToken, authorizeWorkerAction('goodReceipts', 'road', 'create'), createGodownLorryReceipt);
router.get("/get", authenticateToken, authorizeWorkerAction('goodReceipts', 'road', 'read'), getGodownLorryReceipts);
router.delete("/softdelete/:id", authenticateToken, authorizeWorkerAction('goodReceipts', 'road', 'delete'), softDeleteGodownLorryReceipt);
router.delete("/delete/:id", authenticateToken, authorizeWorkerAction('goodReceipts', 'road', 'delete'), deleteGodownLorryReceipt);
router.post("/rejected", authenticateToken, authorizeWorkerAction('goodReceipts', 'road', 'create'), rejectedByParty);

router.patch("/update-status/:id", authenticateToken, authorizeWorkerAction('goodReceipts', 'road', 'update'),acknowledgementImage.single("acknowledgementImage"), updateLorryReceiptStatus);

router.patch("/update-acknowledgement-image/:id",authenticateToken, authorizeWorkerAction('goodReceipts', 'road', 'update'),acknowledgementImage.single("acknowledgementImage"),updateAcknowledgementImage);



module.exports = router;
