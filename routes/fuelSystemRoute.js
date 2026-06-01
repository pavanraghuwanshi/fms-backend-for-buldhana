const express = require('express');
const router = express.Router();
const {getData} = require("../controller/fuelSystemController")
const { authenticateToken } = require('../middleware/authMiddleware');
router.get("/get-fuelsystem-data/:id",authenticateToken,getData);
module.exports = router