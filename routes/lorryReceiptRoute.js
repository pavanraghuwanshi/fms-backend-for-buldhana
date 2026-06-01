const express = require("express");
const { createLorryReceipt, getAllLorryReceipts, getLorryReceiptById, updateLorryReceipt, deleteLorryReceipt } = require("../controller/lorryReceiptController");
const { authenticateToken } = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/create", authenticateToken, createLorryReceipt);
router.get("/get-all-lorry-receipt", authenticateToken, getAllLorryReceipts);
router.get("/get/:id", authenticateToken, getLorryReceiptById);
router.patch("/update/:id", authenticateToken, updateLorryReceipt);
router.delete("/delete/:id", authenticateToken, deleteLorryReceipt);

module.exports = router;
