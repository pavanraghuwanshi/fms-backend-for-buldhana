const express = require("express");
const router = express.Router();

const {
  createCommissionAgent,
  getCommissionAgents,
  getCommissionAgentById,
  updateCommissionAgent,
  deleteCommissionAgent,
} = require("../controller/commissionAgentController");

const { authenticateToken } = require("../middleware/authMiddleware");

router.post("/", authenticateToken, createCommissionAgent);
router.get("/", authenticateToken, getCommissionAgents);
router.get("/:id", authenticateToken, getCommissionAgentById);
router.put("/:id", authenticateToken, updateCommissionAgent);
router.delete("/:id", authenticateToken, deleteCommissionAgent);

module.exports = router;