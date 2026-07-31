const Message = require("../model/messageModel");
const Driver = require("../model/driverModel");
const Vendor = require("../model/vendor");
const Worker = require("../model/workerModel");
const { findAuthEntityById } = require("../middleware/authHelper");

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
        const role = req.user.role;
        const userId = req.user.id;
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const search = req.query.search ? req.query.search.trim().toLowerCase() : null;
        const filterRole = req.query.role ? req.query.role.trim().toLowerCase() : null;

        if (role === "user") {
            const [drivers, vendors, workers] = await Promise.all([
                Driver.find({ supervisor: userId }).select("_id name").lean(),
                Vendor.find({ supervisorId: userId }).select("_id vendorName").lean(),
                Worker.find({ supervisor: userId }).select("_id name").lean()
            ]);

            const driverList = drivers.map(d => ({
                id: d._id,
                name: d.name,
                role: "driver",
            }));

            const vendorList = vendors.map(v => ({
                id: v._id,
                name: v.vendorName || "Vendor",
                role: "vendor",
            }));

            const workerList = workers.map(w => ({
                id: w._id,
                name: w.name,
                role: "worker",
            }));

            let allUsers = [...driverList, ...vendorList, ...workerList];

            if (filterRole) {
                allUsers = allUsers.filter(u => u.role.toLowerCase() === filterRole);
            }

            if (search) {
                allUsers = allUsers.filter(u =>
                    u.name && u.name.toLowerCase().includes(search)
                );
            }

            const total = allUsers.length;
            const startIndex = (page - 1) * limit;
            const paginatedUsers = allUsers.slice(startIndex, startIndex + limit);

            return res.status(200).json({
                success: true,
                message: "Chat users fetched successfully",
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit)) || 0,
                users: paginatedUsers
            });
        } else if (["driver", "vendor", "worker"].includes(role)) {
            const supervisorId = req.user.supervisor || req.user.supervisorId;
            let supervisor = null;
            if (supervisorId) {
                const authData = await findAuthEntityById(supervisorId);
                if (authData?.user) {
                    supervisor = {
                        id: authData.user._id,
                        name: authData.user.username || "Supervisor",
                        role: "user"
                    };
                }
            }
            const users = supervisor ? [supervisor] : [];
            const total = users.length;
            return res.status(200).json({
                success: true,
                message: "Chat users fetched successfully",
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit)) || 0,
                users
            });
        } else {
            return res.status(403).json({ message: "Unauthorized role for chat users" });
        }
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};