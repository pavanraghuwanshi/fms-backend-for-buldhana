const mongoose = require("mongoose");
const { maintenanceDB } = require("../database/database");

const driverExpenseBillImageSchema = new mongoose.Schema(
    {
        base64Data: String,
        contentType: String,
    },
    {
        versionKey: false,
    }
);

const DriverExpenseImage = maintenanceDB.model("DriverExpenseImage", driverExpenseBillImageSchema);
module.exports = DriverExpenseImage;
