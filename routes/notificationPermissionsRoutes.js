const express = require("express");
const router = express.Router();
const {
  createNotificationPermissions,
  getAllNotificationPermissions,
  getNotificationPermissionsById,
  getNotificationPermissionsBySupervisorId,
  updateNotificationPermissions,
  deleteNotificationPermissions,
  getSupervisorList,
} = require("../controller/notificationPermissionsController");
const { authenticateToken } = require("../middleware/authMiddleware");

// All routes are protected by JWT authentication token & restricted to Superadmin
router.post("/", authenticateToken, createNotificationPermissions);
router.get("/", authenticateToken, getAllNotificationPermissions);
router.get("/supervisors/list", authenticateToken, getSupervisorList);
router.get("/supervisor-list", authenticateToken, getSupervisorList);
router.get("/:id", authenticateToken, getNotificationPermissionsById);
router.get("/supervisor/:supervisorId", authenticateToken, getNotificationPermissionsBySupervisorId);
router.put("/:id", authenticateToken, updateNotificationPermissions);
router.delete("/:id", authenticateToken, deleteNotificationPermissions);

module.exports = router;

