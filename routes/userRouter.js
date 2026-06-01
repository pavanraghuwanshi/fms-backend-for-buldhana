const express = require("express");
const { authenticateToken } = require("../middleware/authMiddleware");
const { getAllUsers } = require("../controller/userController");
const router = express.Router();
router.get("/get", authenticateToken, getAllUsers);
module.exports = router;