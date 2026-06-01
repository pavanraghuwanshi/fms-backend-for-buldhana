const express = require("express")
const router = express.Router()
const { addTire, getAllTires, updateTire, deleteTire, getTiresByVehicleId, getBillImageById } = require("../controller/tyreSystemController");
const { authenticateToken } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload")

router.post("/add", authenticateToken, upload.fields([{ name: "billImg", maxCount: 1 }]), addTire);
router.get("/get-all-tyres", authenticateToken, getAllTires);
router.patch("/update/:id", authenticateToken, upload.fields([{ name: "billImg", maxCount: 1 }]), updateTire);
router.delete("/delete/:id", authenticateToken, deleteTire);
router.get("/vehicle/:id", authenticateToken, getTiresByVehicleId);
router.get("/bill-image/:id", authenticateToken, getBillImageById);

module.exports = router;