const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const chatSocket = require("./chat");
const Driver = require("../model/driverModel");
const Vendor = require("../model/vendor");
const Worker = require("../model/workerModel");


function initSockets(server, app) {
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
            credentials: true,
        },
        perMessageDeflate: {
            threshold: 1024,
        }
    });

    if (app) {
        app.set("io", io);
    }

    io.use(async (socket, next) => {
        try {
            let token = socket.handshake.auth?.token
                || socket.handshake.headers?.token
                || socket.handshake.query?.token;

            if (!token && socket.handshake.headers?.authorization) {
                const authHeader = socket.handshake.headers.authorization;
                const parts = authHeader.split(" ");
                token = parts.length === 2 && parts[0].toLowerCase() === "bearer" ? parts[1] : authHeader;
            }

            if (!token) return next(new Error("Authentication error: Token required"));

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (decoded.role === "driver") {
                const driver = await Driver.findById(decoded.id).select("supervisor").lean();
                if (driver?.supervisor) decoded.supervisor = driver.supervisor.toString();
            } else if (decoded.role === "vendor") {
                if (decoded.supervisorId) {
                    decoded.supervisor = decoded.supervisorId.toString();
                } else {
                    const vendor = await Vendor.findById(decoded.id).select("supervisorId").lean();
                    if (vendor?.supervisorId) decoded.supervisor = vendor.supervisorId.toString();
                }
            } else if (decoded.role === "worker") {
                if (decoded.supervisor) {
                    decoded.supervisor = decoded.supervisor.toString();
                } else {
                    const worker = await Worker.findById(decoded.id).select("supervisor").lean();
                    if (worker?.supervisor) decoded.supervisor = worker.supervisor.toString();
                }
            }
            socket.user = decoded;
            next();
        } catch (err) {
            console.error("Authentication error:", err.message);
            return next(new Error("Authentication error: Invalid token"));
        }
    });

    io.on("connection", (socket) => {
        try {
            const userIdStr = String(socket.user.id);
            socket.join(userIdStr);

            console.log(`[Socket Connected] User: ${userIdStr} (${socket.user.username || socket.user.role || 'User'}), Socket: ${socket.id}`);

            socket.emit("connectionAcknowledged", {
                message: "Connected to chat server",
                socketId: socket.id,
                user: socket.user.id
            });
            chatSocket(io, socket);
            return io;
        } catch (error) {
            console.error("Error in socket connection:", error);
            socket.emit("connectionError", {
                message: "Failed to connect to chat server",
                error: error.message
            });
        }
    });
}

module.exports = initSockets;
