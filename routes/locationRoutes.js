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

const { authenticateToken, authorizeWorkerAction } = require("../middleware/authMiddleware");

router.post("/", authenticateToken, authorizeWorkerAction('masters', 'location', 'create'), createLocation);
router.get("/", authenticateToken, authorizeWorkerAction('masters', 'location', 'read'), getLocations);
router.get("/dropdown", authenticateToken, authorizeWorkerAction('masters', 'location', 'read'), getLocationDropdown);
router.get("/:id", authenticateToken, authorizeWorkerAction('masters', 'location', 'read'), getLocationById);
router.put("/:id", authenticateToken, authorizeWorkerAction('masters', 'location', 'update'), updateLocation);
router.delete("/:id", authenticateToken, authorizeWorkerAction('masters', 'location', 'delete'), deleteLocation);

module.exports = router;