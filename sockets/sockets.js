const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const chatSocket = require("./chat");
const Driver = require("../model/driverModel");


function initSockets(server) {
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

    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) return next(new Error("Authentication error: Token required"));

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (decoded.role === "driver") {
                const driver = await Driver.findById(decoded.id).select("supervisor").lean();
                decoded.supervisor = driver.supervisor.toString();
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
            console.log("A new user connected", socket.user.username || "Driver...");

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
