const {credenceDB} = require("../database/database")

const mongoose = require("mongoose");

const report_distanceSchema = new mongoose.Schema(
    {
        deviceId: { type: Number, required: true },
        distance: { type: Number, required: true },
        createdAt: { type: Date, default: Date.now, required: true }
    },
    { versionKey: false }
);

 exports.Report_distance = credenceDB.model('Report_distance', report_distanceSchema);
 