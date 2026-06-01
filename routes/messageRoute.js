const express = require("express");
const { authenticateToken } = require("../middleware/authMiddleware");
const { getMessages } = require("../controller/messageController");
const router = express.Router();

router.get("/chat", authenticateToken, getMessages);

module.exports = router;
