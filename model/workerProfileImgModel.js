const mongoose = require("mongoose");
const { maintenanceDB } = require("../database/database");

const workerProfileImageSchema = new mongoose.Schema(
    {
        base64Data: String,
        contentType: String,
    },
    {
        versionKey: false,
    }
);

const WorkerProfileImage = maintenanceDB.model("WorkerProfileImage", workerProfileImageSchema);
module.exports = WorkerProfileImage;
