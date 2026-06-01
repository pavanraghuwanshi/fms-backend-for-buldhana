const express = require("express");
const { authenticateToken } = require("../middleware/authMiddleware");
const { addWarehouseProducts, getWarehouseProducts, updateWarehouseProducts, deleteWarehouseProducts } = require("../controller/wareHouseController");
const router = express.Router();
router.post("/add", authenticateToken, addWarehouseProducts);
router.get("/get", authenticateToken, getWarehouseProducts);
router.patch("/update/:id", authenticateToken, updateWarehouseProducts);
router.delete("/delete/:id", authenticateToken, deleteWarehouseProducts);
module.exports = router;