const mongoose = require("mongoose");
const { maintenanceDB } = require("../database/database");

const documentLockerSchema = new mongoose.Schema(
    {
        driverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Driver",
            required: [true, "Driver is required please select Driver"],
        },
        documentName: {
            type: String,
            required: [true, "Document Name is required please select document"],
        },
        image: {
            base64Data: String,
            contentType: String,
        },
    },
    {
        timestamps: {
            currentTime: () => {
                const now = new Date();
                const istOffset = 5.5 * 60 * 60 * 1000;
                return new Date(now.getTime() + istOffset);
            },
        },
    }
);

const DocumentLocker = maintenanceDB.model("DocumentLocker", documentLockerSchema);
module.exports = DocumentLocker;
