const express = require("express");
const { authenticateToken, authorizeWorkerAction } = require("../middleware/authMiddleware");
const { getMessages, getChatUsers, sendMessage } = require("../controller/messageController");
const router = express.Router();

router.get("/chat", authenticateToken, authorizeWorkerAction('chat', null, 'read'), getMessages);
router.get("/users", authenticateToken, authorizeWorkerAction('chat', null, 'read'), getChatUsers);
router.post("/send", authenticateToken, authorizeWorkerAction('chat', null, 'create'), sendMessage);
router.post("/", authenticateToken, authorizeWorkerAction('chat', null, 'create'), sendMessage);

module.exports = router;
