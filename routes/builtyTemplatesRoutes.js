const express = require("express");
const router = express.Router();

const {getBuiltyTemplates, createTemplate, updateBuiltyTemplate, deleteBuiltyTemplate} = require("../controller/builtyTemplatesController");
const {authenticateToken} = require("../middleware/authMiddleware");
router.post("/", authenticateToken, createTemplate);
router.get("/", authenticateToken, getBuiltyTemplates);
router.put("/:id", authenticateToken, updateBuiltyTemplate);
router.delete("/:id", authenticateToken, deleteBuiltyTemplate);
module.exports = router;