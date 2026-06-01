const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/authMiddleware");


const {
  createConsignee,
  getAllConsignees,
  getConsigneeById,
  updateConsignee,
  softdeleteConsignee,
} = require("../controller/consigneeController");

router.post("/create", authenticateToken, createConsignee);
router.get("/get", authenticateToken, getAllConsignees);
router.get("/get/:id", authenticateToken, getConsigneeById);
router.patch("/update/:id", authenticateToken, updateConsignee);
router.delete("/softdelete/:id", authenticateToken, softdeleteConsignee);
module.exports = router;
