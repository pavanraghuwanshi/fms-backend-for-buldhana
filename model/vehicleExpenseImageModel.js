const mongoose = require("mongoose");
const { maintenanceDB } = require("../database/database");

const vehicleExpenseBillImageSchema = new mongoose.Schema(
    {
        base64Data: String,
        contentType: String,
    },
    {
        versionKey: false,
    }
);

const VehicleExpenseImage = maintenanceDB.model("VehicleExpenseImage", vehicleExpenseBillImageSchema);
module.exports = VehicleExpenseImage;
