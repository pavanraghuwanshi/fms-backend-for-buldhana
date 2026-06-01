const express = require('express');
const router = express.Router();
const { driverLogin } = require('../controller/loginController');

router.post("/login", driverLogin);

module.exports = router;
