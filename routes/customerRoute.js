const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/authMiddleware");

const { createCustomer, getAllCustomers, getCustomerDropdown, getCustomerById, updateCustomer, deleteCustomer,} = require("../controller/customerController");

router.post("/", authenticateToken, createCustomer);
router.get("/", authenticateToken, getAllCustomers);
router.get("/dropdown", authenticateToken, getCustomerDropdown);
router.get("/:id", authenticateToken, getCustomerById);
router.put("/:id", authenticateToken, updateCustomer);
router.delete("/:id", authenticateToken, deleteCustomer);

module.exports = router;