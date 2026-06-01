const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/authMiddleware");


const {
  createconsignor,
  getAllconsignors,
  getconsignorById,
  updateconsignor,
  softdeleteconsignor,
} = require("../controller/consignorController");

router.post("/create", authenticateToken, createconsignor);
router.get("/get", authenticateToken, getAllconsignors);
router.get("/get/:id", authenticateToken, getconsignorById);
router.patch("/update/:id", authenticateToken, updateconsignor);
router.delete("/softdelete/:id", authenticateToken, softdeleteconsignor);
module.exports = router;
