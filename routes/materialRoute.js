const express = require("express");
const { createMaterialOwner, getMaterialOwners, getMaterialOwnerDropdown, updateMaterialOwner, deleteMaterialOwner } = require("../controller/materialOwnerController");
const { authenticateToken, authorizeWorkerAction } = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/owner", authenticateToken, authorizeWorkerAction('masters', 'materialOwner', 'create'), createMaterialOwner);
router.get("/owner", authenticateToken, authorizeWorkerAction('masters', 'materialOwner', 'read'), getMaterialOwners);
router.get("/owner/dropdown", authenticateToken, authorizeWorkerAction('masters', 'materialOwner', 'read'), getMaterialOwnerDropdown);
router.patch("/owner/:id", authenticateToken, authorizeWorkerAction('masters', 'materialOwner', 'update'), updateMaterialOwner);
router.delete("/owner/:id", authenticateToken, authorizeWorkerAction('masters', 'materialOwner', 'delete'), deleteMaterialOwner);

module.exports = router;
