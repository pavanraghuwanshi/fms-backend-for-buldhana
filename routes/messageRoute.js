const express = require("express");
const { authenticateToken } = require("../middleware/authMiddleware");
const { getMessages, getChatUsers } = require("../controller/messageController");
const router = express.Router();

router.get("/chat", authenticateToken, getMessages);
router.get("/users", authenticateToken, getChatUsers);

module.exports = router;
