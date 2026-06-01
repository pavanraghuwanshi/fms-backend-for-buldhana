const mongoose = require('mongoose');
const { maintenanceDB } = require('../database/database');

const workerSchema = new mongoose.Schema(
    {
        name: { type: String, required: [true, "name is required"] },
        email: { type: String },
        phone: { type: Number, required: [true, "phone is required"], unique: true },
        password: { type: String, required: [true, "password is required"] },
        profileImage: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "WorkerProfileImage"
        },
        supervisorName: { type: String, },
        supervisor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        firebaseToken: [{ type: String }],
        notificationAllow: { type: Boolean, default: false }
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

const Worker = maintenanceDB.model("Worker", workerSchema);
module.exports = Worker;