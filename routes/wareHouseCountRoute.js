const express = require("express");
const router = express.Router();
const { createWarehouse, getWarehouses, getWarehouseById, updateWarehouse, deleteWarehouse, 
     createProduct, getProducts, getProductById, updateProduct, deleteProduct, 
     getWarehousesForDropDown,
     getProductsForDropdown} = require("../controller/wareHouseTypesAddController");
const { authenticateToken } = require("../middleware/authMiddleware");

// Warehouse
router.post("/add",authenticateToken ,createWarehouse);
router.get("/get", authenticateToken,getWarehouses);
router.get("/get_by_id/:id", authenticateToken,getWarehouseById);
router.patch("/update/:id", authenticateToken,updateWarehouse);
router.delete("/delete/:id", authenticateToken,deleteWarehouse);
router.get("/dropdown/list", authenticateToken, getWarehousesForDropDown);



// Product
router.post("/product",authenticateToken,createProduct);
router.get("/product",authenticateToken,getProducts);
router.get("/product/:id",authenticateToken,getProductById);
router.patch("/product/:id",authenticateToken,updateProduct);
router.delete("/product/:id",authenticateToken,deleteProduct);
router.get("/product/dropdown/list",authenticateToken,getProductsForDropdown);

module.exports = router;
