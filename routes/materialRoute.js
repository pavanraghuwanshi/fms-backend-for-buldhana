const express = require("express");
const { createMaterialOwner, getMaterialOwners, getMaterialOwnerDropdown, updateMaterialOwner, deleteMaterialOwner } = require("../controller/materialOwnerController");
const { authenticateToken } = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/owner", authenticateToken, createMaterialOwner);
router.get("/owner", authenticateToken, getMaterialOwners);
router.get("/owner/dropdown", authenticateToken, getMaterialOwnerDropdown);
router.patch("/owner/:id", authenticateToken, updateMaterialOwner);
router.delete("/owner/:id", authenticateToken, deleteMaterialOwner);

module.exports = router;
