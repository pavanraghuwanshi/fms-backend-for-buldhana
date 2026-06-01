const mongoose = require("mongoose");
const { maintenanceDB } = require("../database/database");
const Schema = mongoose.Schema;

const DailyLogSignatureImageSchema = new Schema(
    {
        signatureImg: {
            base64Data: String,
            contentType: String,
        }
    },
    { versionKey: false },
);

const DailyLogSignatureImage = maintenanceDB.model('DailyLogSignatureImage', DailyLogSignatureImageSchema);
module.exports = DailyLogSignatureImage;