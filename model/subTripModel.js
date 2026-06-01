const { maintenanceDB } = require("../database/database");
const mongoose = require("mongoose");

const subTripSchema = new mongoose.Schema(
    {
        tripId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Trip",
            required: [true, "you do not have any trip assigned"],
        },
        startLocation: {
            type: String,
            required: [true, "Start location is required"],
        },
        startLatitude: {
            type: Number
        },
        startLongitude: {
            type: Number
        },
        endLatitude: {
            type: Number
        },
        endLongitude: {
            type: Number
        },
        endLocation: {
            type: String,
            required: [true, "End location is required"],
        },
        companyName: {
            type: String,
            required: [true, "Company name is required"],
        },
        materialType: {
            type: String,
            required: [true, "Material type is required"],
        },
        date: {
            type: Date,
            default: () => {
                const now = new Date();
                const istOffset = 5.5 * 60 * 60 * 1000;
                return new Date(now.getTime() + istOffset);
            },
        },
        budgetAllocated: {
            type: Number,
            default: 0,
        },
        status: {
            type: String,
            enum: ["completed", "cancelled", "in-progress"],
            default: "in-progress",
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

const Subtrip = maintenanceDB.model("Subtrip", subTripSchema);
module.exports = Subtrip;