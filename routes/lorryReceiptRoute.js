const express = require("express");
const { createLorryReceipt, getAllLorryReceipts, getLorryReceiptById, updateLorryReceipt, deleteLorryReceipt } = require("../controller/lorryReceiptController");
const { authenticateToken, authorizeWorkerAction } = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/create", authenticateToken, authorizeWorkerAction('transportPass', 'receipt', 'create'), createLorryReceipt);
router.get("/get-all-lorry-receipt", authenticateToken, authorizeWorkerAction('transportPass', 'receipt', 'read'), getAllLorryReceipts);
router.get("/get/:id", authenticateToken, authorizeWorkerAction('transportPass', 'receipt', 'read'), getLorryReceiptById);
router.patch("/update/:id", authenticateToken, authorizeWorkerAction('transportPass', 'receipt', 'update'), updateLorryReceipt);
router.delete("/delete/:id", authenticateToken, authorizeWorkerAction('transportPass', 'receipt', 'delete'), deleteLorryReceipt);

module.exports = router;
