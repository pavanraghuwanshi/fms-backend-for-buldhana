const express = require("express");
const { authenticateToken } = require("../middleware/authMiddleware");
const { getMessages, getChatUsers, sendMessage } = require("../controller/messageController");
const router = express.Router();

router.get("/chat", authenticateToken, getMessages);
router.get("/users", authenticateToken, getChatUsers);
router.post("/send", authenticateToken, sendMessage);
router.post("/", authenticateToken, sendMessage);

module.exports = router;
