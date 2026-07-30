const mongoose = require("mongoose");
const { maintenanceDB } = require("../database/database");

const notificationPermissionsSchema = new mongoose.Schema(
    {
        supervisorId: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: 'supervisorModel',
            required: true,
            index: true
        },
        supervisorModel: {
            type: String,
            required: true,
            enum: ["School", "Branch", "BranchGroup"],
        },
        driver_attendance_notification: { type: Boolean, default: false },
        driver_daily_trip_notification: { type: Boolean, default: false },
        driver_trip_builty_notification: { type: Boolean, default: false },
        driver_expense: { type: Boolean, default: false },
        vehicle_expense: { type: Boolean, default: false },
        vendor_expense: { type: Boolean, default: false },
        vendor_task_update: { type: Boolean, default: false },
        vendor_builty_create_notification: { type: Boolean, default: false },
        vendor_approve_reject_notification: { type: Boolean, default: false },
        worker_builty_create_notification: { type: Boolean, default: false },
        builty_dispatch: { type: Boolean, default: false },
        builty_complete: { type: Boolean, default: false },
        builty_cancel_notification: { type: Boolean, default: false }
    },
    { timestamps: true }
);


const NotificationPermissions = maintenanceDB.model("NotificationPermissions", notificationPermissionsSchema);
module.exports = NotificationPermissions;