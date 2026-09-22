const express = require("express");
const router = express.Router();
const { authenticateToken, authorizeWorkerAction } = require("../middleware/authMiddleware");


const {
  createConsignee,
  getAllConsignees,
  getConsigneeById,
  updateConsignee,
  softdeleteConsignee,
} = require("../controller/consigneeController");

router.post("/create", authenticateToken, authorizeWorkerAction('masters', 'consignee', 'create'), createConsignee);
router.get("/get", authenticateToken, authorizeWorkerAction('masters', 'consignee', 'read'), getAllConsignees);
router.get("/get/:id", authenticateToken, authorizeWorkerAction('masters', 'consignee', 'read'), getConsigneeById);
router.patch("/update/:id", authenticateToken, authorizeWorkerAction('masters', 'consignee', 'update'), updateConsignee);
router.delete("/softdelete/:id", authenticateToken, authorizeWorkerAction('masters', 'consignee', 'delete'), softdeleteConsignee);
module.exports = router;
