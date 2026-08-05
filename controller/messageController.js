const mongoose = require("mongoose");
const Message = require("../model/messageModel");
const Driver = require("../model/driverModel");
const Vendor = require("../model/vendor");
const Worker = require("../model/workerModel");
const { findAuthEntityById } = require("../middleware/authHelper");
const { notifyChatMessage } = require("../services/notificationService");

function buildRecentChatMap(messages, currentUserIdStr) {
    const chatMap = new Map();

    for (const msg of messages) {
        const sId = String(msg.senderId);
        const rId = String(msg.receiverId);
        const otherId = sId === currentUserIdStr ? rId : sId;

        if (!chatMap.has(otherId)) {
            chatMap.set(otherId, {
                lastMessage: msg.text,
                lastMessageTime: msg.createdAt,
                unreadCount: 0
            });
        }

        if (rId === currentUserIdStr && msg.status !== "read") {
            const info = chatMap.get(otherId);
            info.unreadCount = (info.unreadCount || 0) + 1;
        }
    }

    return chatMap;
}

async function fetchSupervisorChatContacts(userId, filterRole) {
    const currentUserIdStr = String(userId);

    const fetchDrivers = !filterRole || filterRole === "driver" || filterRole === "drivers" || filterRole === "all";
    const fetchVendors = !filterRole || filterRole === "vendor" || filterRole === "vendors" || filterRole === "all";
    const fetchWorkers = !filterRole || filterRole === "worker" || filterRole === "workers" || filterRole === "all";

    const [drivers, vendors, workers, messages] = await Promise.all([
        fetchDrivers ? Driver.find({ supervisor: userId }).select("_id name").lean() : Promise.resolve([]),
        fetchVendors ? Vendor.find({ supervisorId: userId }).select("_id vendorName").lean() : Promise.resolve([]),
        fetchWorkers ? Worker.find({ supervisor: userId }).select("_id name").lean() : Promise.resolve([]),
        Message.find({
            $or: [
                { senderId: currentUserIdStr },
                { receiverId: currentUserIdStr }
            ]
        }).sort({ createdAt: -1 }).lean()
    ]);

    const recentChatMap = buildRecentChatMap(messages, currentUserIdStr);

    const driverList = drivers.map(d => ({ id: d._id, name: d.name, role: "driver" }));
    const vendorList = vendors.map(v => ({ id: v._id, name: v.vendorName || "Vendor", role: "vendor" }));
    const workerList = workers.map(w => ({ id: w._id, name: w.name, role: "worker" }));

    let allUsers = [...driverList, ...vendorList, ...workerList];

    // Enrich contacts with recent chat metadata
    allUsers = allUsers.map(u => {
        const uIdStr = String(u.id);
        const chatInfo = recentChatMap.get(uIdStr);
        return {
            ...u,
            lastMessage: chatInfo ? chatInfo.lastMessage : null,
            lastMessageTime: chatInfo ? chatInfo.lastMessageTime : null,
            unreadCount: chatInfo ? chatInfo.unreadCount : 0
        };
    });

    // Priority Sort: Recent chat users first (by lastMessageTime descending)
    allUsers.sort((a, b) => {
        if (a.lastMessageTime && b.lastMessageTime) {
            return new Date(b.lastMessageTime) - new Date(a.lastMessageTime);
        }
        if (a.lastMessageTime) return -1;
        if (b.lastMessageTime) return 1;
        return 0;
    });

    return allUsers;
}

async function fetchSubordinateSupervisorContact(userId, userObj) {
    const supervisorId = userObj.supervisor || userObj.supervisorId;
    if (!supervisorId) return [];

    const authData = await findAuthEntityById(supervisorId);
    if (!authData?.user) return [];

    const supervisorIdStr = String(authData.user._id);
    const currentUserIdStr = String(userId);

    const [lastMsg, unreadCount] = await Promise.all([
        Message.findOne({
            $or: [
                { senderId: currentUserIdStr, receiverId: supervisorIdStr },
                { senderId: supervisorIdStr, receiverId: currentUserIdStr }
            ]
        }).sort({ createdAt: -1 }).lean(),
        Message.countDocuments({
            senderId: supervisorIdStr,
            receiverId: currentUserIdStr,
            status: { $ne: "read" }
        })
    ]);

    return [{
        id: authData.user._id,
        name: authData.user.username || "Supervisor",
        role: "user",
        lastMessage: lastMsg ? lastMsg.text : null,
        lastMessageTime: lastMsg ? lastMsg.createdAt : null,
        unreadCount
    }];
}

function filterAndPaginateUsers(users, search, filterRole, page, limit) {
    let filtered = users;

    if (filterRole && filterRole !== "all") {
        const targetRole = filterRole.endsWith("s") ? filterRole.slice(0, -1) : filterRole;
        filtered = filtered.filter(u => u.role.toLowerCase() === targetRole);
    }

    if (search) {
        filtered = filtered.filter(u =>
            u.name && u.name.toLowerCase().includes(search)
        );
    }

    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const paginatedUsers = filtered.slice(startIndex, startIndex + limit);

    return {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)) || 0,
        users: paginatedUsers
    };
}

exports.getMessages = async (req, res) => {
    try {
        const role = req.user.role;
        if (!["user", "driver", "vendor", "worker"].includes(role)) {
            return res.status(403).json({ message: "You are not authorized to view messages" });
        }
        let receiverId, senderId;
        if (role === "driver") {
            receiverId = req.user.supervisor;
            senderId = req.user.id;
        } else if (role === "vendor") {
            receiverId = req.user.supervisorId || req.user.supervisor;
            senderId = req.user.id;
        } else if (role === "worker") {
            receiverId = req.user.supervisor;
            senderId = req.user.id;
        } else if (role === "user") {
            receiverId = req.user.id;
            senderId = req.query.senderId;
        }

        if (!senderId || !receiverId) {
            return res.status(400).json({ message: "senderId and receiverId required." });
        }
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

exports.getChatUsers = async (req, res) => {
    try {
        const { role, id: userId } = req.user;
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const search = req.query.search ? req.query.search.trim().toLowerCase() : null;
        const filterRoleRaw = req.query.role || req.query.filterRole || req.query.userType || req.query.type;
        const filterRole = filterRoleRaw ? String(filterRoleRaw).trim().toLowerCase() : null;

        let users = [];

        if (role === "user") {
            users = await fetchSupervisorChatContacts(userId, filterRole);
        } else if (["driver", "vendor", "worker"].includes(role)) {
            users = await fetchSubordinateSupervisorContact(userId, req.user);
        } else {
            return res.status(403).json({ message: "Unauthorized role for chat users" });
        }

        const paginatedResult = filterAndPaginateUsers(users, search, filterRole, page, limit);

        return res.status(200).json({
            success: true,
            message: "Chat users fetched successfully",
            ...paginatedResult
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

exports.sendMessage = async (req, res) => {
    try {
        const senderId = String(req.user.id);
        const role = req.user.role;
        let { receiverId, text, tempId } = req.body;

        if (!receiverId && (role === "driver" || role === "vendor" || role === "worker")) {
            receiverId = req.user.supervisor || req.user.supervisorId;
        }

        if (!receiverId || !text) {
            return res.status(400).json({ success: false, message: "receiverId and text are required" });
        }

        if (!mongoose.Types.ObjectId.isValid(receiverId)) {
            return res.status(400).json({ success: false, message: "Invalid receiverId" });
        }

        const receiverIdStr = String(receiverId);

        // Idempotency check with tempId
        if (tempId) {
            const existingMessage = await Message.findOne({ senderId, tempId: String(tempId) });
            if (existingMessage) {
                return res.status(200).json({
                    success: true,
                    message: "Message already processed",
                    data: existingMessage
                });
            }
        }

        let message = await Message.create({
            senderId,
            receiverId: receiverIdStr,
            text,
            tempId: tempId ? String(tempId) : undefined,
            status: "sent"
        });

        // Real-time socket integration
        const io = req.app.get("io");
        const { isUserOnline } = require("../sockets/chat");

        const receiverOnline = isUserOnline ? isUserOnline(receiverIdStr) : false;

        if (receiverOnline) {
            message = await Message.findByIdAndUpdate(
                message._id,
                { status: "delivered" },
                { new: true }
            );

            if (io) {
                // Send to receiver room
                io.to(receiverIdStr).emit("receiveMessage", message);

                // Notify sender room about delivery
                io.to(senderId).emit("messageDelivered", {
                    messageId: message._id,
                    receiverId: receiverIdStr,
                    tempId: tempId ? String(tempId) : undefined
                });
            }
        }

        const messageData = message.toObject ? message.toObject() : message;
        console.log(`42["messageStatus",${JSON.stringify(messageData)}]`);

        if (io) {
            io.to(senderId).emit("messageStatus", message);
        }

        // Trigger push notification asynchronously
        notifyChatMessage({
            senderId,
            senderRole: role,
            senderName: req.user.username || req.user.name,
            receiverId: receiverIdStr,
            text,
            messageId: message._id
        }).catch(err => console.error("Error sending chat notification:", err));

        return res.status(201).json({
            success: true,
            message: "Message sent successfully",
            data: message
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};