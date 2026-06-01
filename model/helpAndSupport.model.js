const mongoose = require("mongoose");
const { maintenanceDB } = require("../database/database");

const HelpAndSupportSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        driver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Driver",
        },
        supervisor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        vehicle: {
            type: String,
        },
        ticketType: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        feedback: {
            type: String,
        },
        status: {
            type: String,
            default: "pending"
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
    },
);

const HelpAndSupport = maintenanceDB.model("HelpAndSupport", HelpAndSupportSchema);
module.exports = HelpAndSupport;
