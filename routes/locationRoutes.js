const express = require("express");
const router = express.Router();

const {
  createLocation,
  getLocations,
  getLocationById,
  updateLocation,
  deleteLocation,
  getLocationDropdown,
} = require("../controller/locationController");

const { authenticateToken } = require("../middleware/authMiddleware");

router.post("/", authenticateToken, createLocation);
router.get("/", authenticateToken, getLocations);
router.get("/dropdown", authenticateToken, getLocationDropdown);
router.get("/:id", authenticateToken, getLocationById);
router.put("/:id", authenticateToken, updateLocation);
router.delete("/:id", authenticateToken, deleteLocation);

module.exports = router;