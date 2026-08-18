const mongoose = require("mongoose");
const { maintenanceDB } = require("../database/database");

const vendorLogSchema = new mongoose.Schema(
    {
        // References - All optional
        driverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Driver",
            index: true,
            default: null,
        },
        vehicleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "VehicleMaster",
            index: true,
            default: null,
        },
        tripId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Trip",
            index: true,
            default: null,
        },
        builtyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Builty",

            default: null,
        },
        vendorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Vendor",
            index: true,
            default: null,
        },

        // File Paths
        billImgPath: {
            type: String,
            default: null,
        },
        vehicleImgPath: {
            type: String,
            default: null,
        },
        profileImgPaths: {
            type: [String],
            default: [],
        },

        // Metadata
        description: {
            type: String,
            trim: true,
            maxlength: 500,
            default: null,
        },

        amount: {
            type: Number, default: 0
        },

        odometer: {
            type: Number,
            default: null,
        },

        odometerImgPath: {
            type: String,
            default: null,
        },

        fuel: {
            type: Number,
            default: null,
        },

        vendorType: {
            type: String,
            enum: ["Fuel Pump", "Garage/Workshop", "Tyre Dealer"],
            default: null,
            index: true,
        },

        status: {
            type: String,
            enum: ["Pending", "Rejected", "Approved"],
            default: "Pending",
            index: true,
        },

        // Location Details
        vendorLat: {
            type: Number,
            default: null,
        },
        vendorLong: {
            type: Number,
            default: null,
        },
        vendorAddress: {
            type: String,
            trim: true,
            default: null,
        },
        driverLat: {
            type: Number,
            default: null,
        },
        driverLong: {
            type: Number,
            default: null,
        },
        driverAddress: {
            type: String,
            trim: true,
            default: null,
        },

        // Scoping (Required for security)
        supervisorId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            index: true,
        },
        createdBy: {
            type: String,
            enum: ["supervisor", "vendor"],
            default: "vendor",
        },
        vendorAction: {
            type: String,
            enum: ["Completed", "Pending"],
            default: "Completed",
        },
        driverAction: {
            type: String,
            enum: ["Completed", "Pending"],
            default: "Pending",
        },
        date: {
            type: Date,
            default: Date.now,
            index: true
        }
    },
    { timestamps: true }
);



const VendorLog = maintenanceDB.model("VendorLog", vendorLogSchema);
module.exports = VendorLog;