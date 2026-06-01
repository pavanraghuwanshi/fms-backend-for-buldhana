const express = require("express");
const router = express.Router();

const {  createTransporter, getTransporters, getTransporterById, updateTransporter, deleteTransporter,} = require("../controller/transporterController");

const { auth } = require("../middleware/auth");

router.post("/", auth, createTransporter);
router.get("/", auth, getTransporters);
router.get("/:id", auth, getTransporterById);
router.put("/:id", auth, updateTransporter);
router.delete("/:id", auth, deleteTransporter);

module.exports = router;