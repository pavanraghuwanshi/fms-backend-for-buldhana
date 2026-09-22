const express = require("express");
const router = express.Router();

const {
  createCommissionAgent,
  getCommissionAgents,
  getCommissionAgentById,
  updateCommissionAgent,
  deleteCommissionAgent,
} = require("../controller/commissionAgentController");

const { authenticateToken, authorizeWorkerAction } = require("../middleware/authMiddleware");

router.post("/", authenticateToken, authorizeWorkerAction('masters', 'commAgent', 'create'), createCommissionAgent);
router.get("/", authenticateToken, authorizeWorkerAction('masters', 'commAgent', 'read'), getCommissionAgents);
router.get("/:id", authenticateToken, authorizeWorkerAction('masters', 'commAgent', 'read'), getCommissionAgentById);
router.put("/:id", authenticateToken, authorizeWorkerAction('masters', 'commAgent', 'update'), updateCommissionAgent);
router.delete("/:id", authenticateToken, authorizeWorkerAction('masters', 'commAgent', 'delete'), deleteCommissionAgent);

module.exports = router;