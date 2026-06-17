const express = require("express");
const router = express.Router();
const {deleteLog,updateLog, getLogById, getAllLogs} = require("../controllers/vendorLogController");

const { authenticateToken } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
router.use(authenticateToken);


// routes/vendorLogRoutes.js
router.post("/", upload.fields([
  { name: "billImgPath", maxCount: 1 },
  { name: "vehicleImgPath", maxCount: 1 },
  { name: "profileImgPaths", maxCount: 5 }
]), controller.createLog);
router.get("/", getAllLogs);
router.get("/:id", getLogById);
router.put("/:id", updateLog);
router.delete("/:id", deleteLog);

module.exports = router;