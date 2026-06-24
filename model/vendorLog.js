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
            index: {
                unique: true,
                partialFilterExpression: { builtyId: { $type: "objectId" } }
            },
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

        status: {
            type: String,
            enum: ["Pending", "Approved"],
            default: "Pending",
            index: true,
        },

        // Scoping (Required for security)
        supervisorId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            index: true,
        },
    },
    { timestamps: true }
);

// Composite index to speed up lookups involving multiple filters
vendorLogSchema.index({ supervisorId: 1, builtyId: 1, driverId: 1 });

const VendorLog = maintenanceDB.model("VendorLog", vendorLogSchema);
module.exports = VendorLog;