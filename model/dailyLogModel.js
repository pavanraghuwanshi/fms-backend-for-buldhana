const mongoose = require("mongoose");
const { maintenanceDB } = require("../database/database");
const Schema = mongoose.Schema;

const DailyLogSchema = new Schema(
    {
        driverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Driver",
            required: true,
        },
        vehicleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Device",
            required: true,
        },
        vehicleName: {
            type: String,
            required: true,
        },
        startDate: {
            type: Date,
        },
        endDate: {
            type: Date,
        },
        logKM: {
            type: Number,
        },
        gpsKM: {
            type: Number,
        },
        startOdometerReading: {
            type: Number,
        },
        endOdometerReading: {
            type: Number,
        },
        signatureId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'DailyLogSignatureImage',
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

const DailyLog = maintenanceDB.model('DailyLog', DailyLogSchema);
module.exports = DailyLog;