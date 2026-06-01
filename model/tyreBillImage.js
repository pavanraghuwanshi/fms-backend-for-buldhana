const mongoose = require("mongoose");
const { maintenanceDB } = require("../database/database");

const tyreBillImage = new mongoose.Schema(
    {
        base64Data: String,
        contentType: String,
    },
    {
        versionKey: false,
    }
);

const TyreBillImage = maintenanceDB.model("TyreBillImage", tyreBillImage);
module.exports = TyreBillImage;
