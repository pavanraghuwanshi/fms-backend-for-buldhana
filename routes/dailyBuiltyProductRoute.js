const express = require("express");
const router = express.Router();
const { createDailyBuiltyProduct, getDailyBuiltyProducts, getDailyBuiltyProductsForDropdown, getDailyBuiltyProductById, updateDailyBuiltyProduct, deleteDailyBuiltyProduct } = require("../controller/dailyBuiltyProductController");
const { authenticateToken } = require("../middleware/authMiddleware");






// Daily Builty Product
router.post("/", authenticateToken, createDailyBuiltyProduct);
router.get("/", authenticateToken, getDailyBuiltyProducts);

// dropdown MUST be before /:id
router.get("/dropdown/list", authenticateToken, getDailyBuiltyProductsForDropdown);

router.get("/:id", authenticateToken, getDailyBuiltyProductById);
router.patch("/:id", authenticateToken, updateDailyBuiltyProduct);
router.delete("/:id", authenticateToken, deleteDailyBuiltyProduct);

module.exports = router;
