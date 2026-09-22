const express = require("express");
const router = express.Router();
const { authenticateToken, authorizeWorkerAction } = require("../middleware/authMiddleware");


const {
  createconsignor,
  getAllconsignors,
  getconsignorById,
  updateconsignor,
  softdeleteconsignor,
} = require("../controller/consignorController");

router.post("/create", authenticateToken, authorizeWorkerAction('masters', 'consignor', 'create'), createconsignor);
router.get("/get", authenticateToken, authorizeWorkerAction('masters', 'consignor', 'read'), getAllconsignors);
router.get("/get/:id", authenticateToken, authorizeWorkerAction('masters', 'consignor', 'read'), getconsignorById);
router.patch("/update/:id", authenticateToken, authorizeWorkerAction('masters', 'consignor', 'update'), updateconsignor);
router.delete("/softdelete/:id", authenticateToken, authorizeWorkerAction('masters', 'consignor', 'delete'), softdeleteconsignor);
module.exports = router;
