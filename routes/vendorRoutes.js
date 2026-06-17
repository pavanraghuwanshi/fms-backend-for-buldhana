const express = require("express");
const router = express.Router();

const {
  createVendor,
  getVendors,
  getVendorById,
  updateVendor,
  deleteVendor,
  getVendorDropdown,
  vendorLogin,
  updateFcmToken,
  getVendorBuiltys
} = require("../controller/vendorController");

const { authenticateToken } = require('../middleware/authMiddleware');

router.post("/login", vendorLogin);
router.get("/my-builtys-history", authenticateToken, getVendorBuiltys);
router.post("/", authenticateToken, createVendor);
router.get("/", authenticateToken, getVendors);
router.get("/dropdown", authenticateToken, getVendorDropdown);
router.get("/:id", authenticateToken, getVendorById);
router.put("/:id", authenticateToken, updateVendor);
router.delete("/:id", authenticateToken, deleteVendor);
router.post("/update-fcm", authenticateToken, updateFcmToken);

module.exports = router;