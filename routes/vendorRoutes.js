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
  getVendorBuiltys,
  saveOrUpdateToken
} = require("../controller/vendorController");

const { authenticateToken } = require('../middleware/authMiddleware');
router.post("/update-fcm", authenticateToken, saveOrUpdateToken);
router.post("/login", vendorLogin);
router.get("/my-builtys-history", authenticateToken, getVendorBuiltys);
router.post("/", authenticateToken, createVendor);
router.get("/", authenticateToken, getVendors);
router.get("/dropdown", authenticateToken, getVendorDropdown);
router.get("/:id", authenticateToken, getVendorById);
router.put("/:id", authenticateToken, updateVendor);
router.delete("/:id", authenticateToken, deleteVendor);

module.exports = router;