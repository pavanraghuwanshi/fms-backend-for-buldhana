const express = require('express');
const router = express.Router();
const { authenticateToken } = require("../middleware/authMiddleware");
const { getAuditLogs } = require('../controller/auditLogController'); 

router.get("/", authenticateToken, getAuditLogs); 

module.exports = router;