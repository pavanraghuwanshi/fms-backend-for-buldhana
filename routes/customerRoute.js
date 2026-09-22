const express = require("express");
const router = express.Router();
const { authenticateToken, authorizeWorkerAction } = require("../middleware/authMiddleware");

const { createCustomer, getAllCustomers, getCustomerDropdown, getCustomerById, updateCustomer, deleteCustomer,} = require("../controller/customerController");

router.post("/", authenticateToken, authorizeWorkerAction('masters', 'customer', 'create'), createCustomer);
router.get("/", authenticateToken, authorizeWorkerAction('masters', 'customer', 'read'), getAllCustomers);
router.get("/dropdown", authenticateToken, authorizeWorkerAction('masters', 'customer', 'read'), getCustomerDropdown);
router.get("/:id", authenticateToken, authorizeWorkerAction('masters', 'customer', 'read'), getCustomerById);
router.put("/:id", authenticateToken, authorizeWorkerAction('masters', 'customer', 'update'), updateCustomer);
router.delete("/:id", authenticateToken, authorizeWorkerAction('masters', 'customer', 'delete'), deleteCustomer);

module.exports = router;