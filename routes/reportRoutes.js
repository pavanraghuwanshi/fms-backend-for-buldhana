const express = require("express");
const router = express.Router();
const { monthlyConsigneeReport } = require("../controller/reportController");

router.get("/monthly-consignee", monthlyConsigneeReport);

module.exports = router;
