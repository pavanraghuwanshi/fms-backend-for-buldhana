const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { createIssue, getTickets, updateTicket, getPendingTickets } = require('../controller/helpAndSupportController');

router.post("/create", authenticateToken, createIssue);
router.get("/get-tickets", authenticateToken, getTickets);
router.get("/get-pending-tickets", authenticateToken, getPendingTickets);
router.patch("/update/:id", authenticateToken, updateTicket);

module.exports = router