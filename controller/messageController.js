const Message = require("../model/messageModel");

exports.getMessages = async (req, res) => {
    try {
        const role = req.user.role;
        if (!["user", "driver"].includes(role)) return res.status(403).json({ message: "You are not authorized to view messages" });
        let receiverId, senderId;
        if (role === "driver") {
            receiverId = req.user.supervisor;
            senderId = req.user.id;
        } else if (role === "user") {
            receiverId = req.user.id;
            senderId = req.query.senderId;
        }

        if (!senderId || !receiverId) return res.status(400).json({ message: "senderId and receiverId required." });
        const messages = await Message.find({
            $or: [
                { senderId, receiverId },
                { senderId: receiverId, receiverId: senderId }
            ]
        }).sort({ createdAt: 1 });

        return res.status(200).json({ success: true, messages });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};