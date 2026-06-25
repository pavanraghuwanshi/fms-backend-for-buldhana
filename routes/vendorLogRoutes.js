const express = require("express");
const router = express.Router();
const {createLog, deleteLog,updateLog,  getAllLogs, updateLogStatus} = require("../controller/vendorLogController");

const { authenticateToken } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
router.use(authenticateToken);


// routes/vendorLogRoutes.js
router.post("/", upload.fields([
  { name: "billImgPath", maxCount: 1 },
  { name: "vehicleImgPath", maxCount: 1 },
  { name: "profileImgPaths", maxCount: 5 }
]), createLog);
router.get("/", getAllLogs);
//router.get("/:id", getLogById);
router.put("/:id", updateLog);
router.delete("/:id", deleteLog);
router.patch('/logs/status/:id', updateLogStatus);
module.exports = router;