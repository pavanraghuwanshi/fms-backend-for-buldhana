const express = require("express");
const router = express.Router();

const builtyController = require("../controller/builtyController");
const {authenticateToken} = require("../middleware/authMiddleware");

router.post("/", authenticateToken, builtyController.createBuilty);
router.get("/", authenticateToken, builtyController.getBuiltys);
router.get("/:id", authenticateToken, builtyController.getBuiltyById);
router.put("/update/:id", authenticateToken, builtyController.updateBuilty);
router.put("/dispatch/:id", authenticateToken, builtyController.dispatchBuilty);
router.put("/complete/:id",  authenticateToken,  builtyController.completeBuilty);

router.put( "/cancel/:id", authenticateToken, builtyController.cancelBuilty);

module.exports = router;