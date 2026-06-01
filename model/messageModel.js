const mongoose = require("mongoose");
const { maintenanceDB } = require('../database/database');

const messageSchema = new mongoose.Schema(
    {
        senderId: { type: String, required: true },
        receiverId: { type: String, required: true },
        text: { type: String, required: true },
        status: { type: String, enum: ["sent", "delivered", "read"], default: "sent" },
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

const Message = maintenanceDB.model("Message", messageSchema);
module.exports = Message;
