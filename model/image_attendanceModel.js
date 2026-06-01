const mongoose = require("mongoose");
const { maintenanceDB } = require("../database/database");

const image_attendanceSchema = new mongoose.Schema(
    {
        base64Data: String,
        contentType: String,
    },
    {
        versionKey: false,
    }
);

const Image_attendance = maintenanceDB.model("Image_attendance", image_attendanceSchema);
module.exports = Image_attendance;
