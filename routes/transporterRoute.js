const express = require("express");
const router = express.Router();

const {  createTransporter, getTransporters, getTransporterById, updateTransporter, deleteTransporter, getTransporterDropdown,} = require("../controller/transporterController");

const { authenticateToken, authorizeWorkerAction } = require("../middleware/authMiddleware");

router.post("/", authenticateToken, authorizeWorkerAction('masters', 'transporter', 'create'), createTransporter);
router.get("/", authenticateToken, authorizeWorkerAction('masters', 'transporter', 'read'), getTransporters);
router.get("/:id", authenticateToken, authorizeWorkerAction('masters', 'transporter', 'read'), getTransporterById);
router.put("/:id", authenticateToken, authorizeWorkerAction('masters', 'transporter', 'update'), updateTransporter);
router.delete("/:id", authenticateToken, authorizeWorkerAction('masters', 'transporter', 'delete'), deleteTransporter);
router.get( "/dropdown",  authenticateToken, authorizeWorkerAction('masters', 'transporter', 'read'),  getTransporterDropdown);

module.exports = router;