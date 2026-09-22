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

const { authenticateToken, authorizeWorkerAction } = require('../middleware/authMiddleware');
router.post("/update-fcm", authenticateToken, authorizeWorkerAction('masters', 'vendor', 'create'), saveOrUpdateToken);
router.post("/login", vendorLogin);
router.get("/my-builtys-history", authenticateToken, authorizeWorkerAction('masters', 'vendor', 'create'), getVendorBuiltys);
router.post("/", authenticateToken, authorizeWorkerAction('masters', 'vendor', 'create'), createVendor);
router.get("/", authenticateToken, authorizeWorkerAction('masters', 'vendor', 'read'), getVendors);
router.get("/dropdown", authenticateToken, authorizeWorkerAction('masters', 'vendor', 'read'), getVendorDropdown);
router.get("/:id", authenticateToken, authorizeWorkerAction('masters', 'vendor', 'read'), getVendorById);
router.put("/:id", authenticateToken, authorizeWorkerAction('masters', 'vendor', 'update'), updateVendor);
router.delete("/:id", authenticateToken, authorizeWorkerAction('masters', 'vendor', 'delete'), deleteVendor);

module.exports = router;