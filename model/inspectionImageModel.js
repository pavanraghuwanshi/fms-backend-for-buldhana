const mongoose = require("mongoose");
const { maintenanceDB } = require("../database/database");

const inspectionImage = new mongoose.Schema(
    {
        base64Data: String,
        contentType: String,
    },
    {
        versionKey: false,
    }
);

const InspectionImage = maintenanceDB.model("InspectionImage", inspectionImage);
module.exports = InspectionImage;
