const mongoose = require("mongoose");
const Driver = require("../model/driverModel");
const Vendor = require("../model/vendor");
const Worker = require("../model/workerModel");
const Message = require("../model/messageModel");
const User = require("../model/userModel");
const { notifyChatMessage } = require("../services/notificationService");

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// In-memory mapping of userId -> Set of socketIds (supports multi-device/multi-socket)
const onlineUsers = new Map();

function isUserOnline(userIdStr) {
  const sockets = onlineUsers.get(String(userIdStr));
  return Boolean(sockets && sockets.size > 0);
}

function chatSocket(io, socket) {
  // 1. Authenticate & derive senderId from socket.user
  if (!socket.user || !socket.user.id) {
    console.error("[Socket Chat] Unauthenticated connection attempt rejected.");
    return socket.disconnect(true);
  }

  const userId = String(socket.user.id);

  // 2. Track online user sockets
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId).add(socket.id);

  // Join room named after userId for broadcasting across all sockets of this user
  socket.join(userId);

  console.log(`[Socket Chat Connected] User ID: ${userId}, Role: ${socket.user.role}, Socket ID: ${socket.id}, Active Sockets: ${onlineUsers.get(userId).size}`);

  // 3. Deliver pending offline messages upon reconnect
  (async () => {
    try {
      const pendingMessages = await Message.find({
        receiverId: userId,
        status: "sent"
      }).sort({ createdAt: 1 });

      if (pendingMessages.length > 0) {
        const pendingIds = pendingMessages.map(m => m._id);

        // Update all pending messages to 'delivered'
        await Message.updateMany(
          { _id: { $in: pendingIds } },
          { $set: { status: "delivered" } }
        );

        const updatedPendingMessages = await Message.find({
          _id: { $in: pendingIds }
        }).sort({ createdAt: 1 });

        // Deliver pending messages to newly reconnected user
        socket.emit("pendingMessages", updatedPendingMessages);

        // Group by sender and notify online senders about delivery
        const senderGroup = new Map();
        for (const msg of updatedPendingMessages) {
          const sId = String(msg.senderId);
          if (!senderGroup.has(sId)) senderGroup.set(sId, []);
          senderGroup.get(sId).push(msg._id);
        }

        for (const [sId, mIds] of senderGroup.entries()) {
          io.to(sId).emit("messageDelivered", {
            messageIds: mIds,
            receiverId: userId
          });
        }

        console.log(`[Socket Offline Recovery] Delivered ${updatedPendingMessages.length} pending offline message(s) to user ${userId}`);
      }
    } catch (err) {
      console.error(`[Socket Offline Recovery Error] User ${userId}:`, err);
    }
  })();

  // 4. Handle sendMessage event
  socket.on("sendMessage", async (payload, ackCallback) => {
    try {
      const { receiverId: clientReceiverId, text, tempId } = payload || {};
      let receiverId = clientReceiverId;

      // Always derive senderId from authenticated socket context
      const senderId = userId;

      // Auto-fallback supervisor receiverId for worker/driver/vendor
      if (!receiverId && (socket.user.role === "driver" || socket.user.role === "vendor" || socket.user.role === "worker")) {
        receiverId = socket.user.supervisor || socket.user.supervisorId;
      }

      if (!receiverId || !text) {
        const errorMsg = "receiverId and text required";
        console.warn(`[Socket sendMessage] Validation failed for sender ${senderId}: ${errorMsg}`);
        if (typeof ackCallback === "function") ackCallback({ success: false, error: errorMsg });
        return socket.emit("error", { message: errorMsg });
      }

      const receiverIdStr = String(receiverId);

      if (!isValidId(receiverIdStr)) {
        const errorMsg = "Invalid receiverId";
        console.error(`[Socket sendMessage] Invalid receiverId: ${receiverIdStr}`);
        if (typeof ackCallback === "function") ackCallback({ success: false, error: errorMsg });
        return socket.emit("error", { message: errorMsg });
      }

      // Idempotency Check: if tempId provided, avoid duplicate message creation
      if (tempId) {
        const existingMessage = await Message.findOne({ senderId, tempId: String(tempId) });
        if (existingMessage) {
          console.log(`[Socket sendMessage] Duplicate message prevented for tempId: ${tempId}`);
          const existingData = existingMessage.toObject ? existingMessage.toObject() : existingMessage;
          if (typeof ackCallback === "function") {
            ackCallback({ success: true, message: existingData, tempId });
          }
          return socket.emit("messageStatus", existingMessage);
        }
      }

      // Save message first in database with initial status 'sent'
      let message = await Message.create({
        senderId,
        receiverId: receiverIdStr,
        text,
        tempId: tempId ? String(tempId) : undefined,
        status: "sent"
      });

      const receiverOnline = isUserOnline(receiverIdStr);

      if (receiverOnline) {
        message = await Message.findByIdAndUpdate(
          message._id,
          { status: "delivered" },
          { new: true }
        );

        // Broadcast real-time message to RECEIVER's room
        io.to(receiverIdStr).emit("receiveMessage", message);
        console.log(`[Socket receiveMessage] Delivered to receiver room: ${receiverIdStr}`);

        // Notify sender room about delivery confirmation
        io.to(senderId).emit("messageDelivered", {
          messageId: message._id,
          receiverId: receiverIdStr,
          tempId: tempId ? String(tempId) : undefined
        });
      }

      // Always dispatch FCM Push Notification to RECEIVER asynchronously
      notifyChatMessage({
        senderId,
        senderRole: socket.user.role,
        senderName: socket.user.username || socket.user.name,
        receiverId: receiverIdStr,
        text,
        messageId: message._id
      }).catch(err => console.error("Error sending chat push notification to receiver:", err));

      const messageData = message.toObject ? message.toObject() : message;

      // Print Socket.IO Engine.IO wire packet format
      console.log(`42["messageStatus",${JSON.stringify(messageData)}]`);

      // Emit status update to SENDER room
      io.to(senderId).emit("messageStatus", message);

      // Invoke acknowledgment callback if provided by client
      if (typeof ackCallback === "function") {
        ackCallback({
          success: true,
          message: messageData,
          tempId: tempId ? String(tempId) : undefined
        });
      }
    } catch (error) {
      console.error("[Socket sendMessage Error]:", error);
      if (typeof ackCallback === "function") {
        ackCallback({ success: false, error: error.message || "Failed to send message" });
      }
      socket.emit("error", { message: error.message || "Failed to send message" });
    }
  });

  // 5. Handle markAsRead event
  socket.on("markAsRead", async ({ messageIds }) => {
    try {
      const readerId = userId; // Derive readerId from socket authentication

      if (
        !Array.isArray(messageIds) ||
        messageIds.length === 0 ||
        messageIds.some(id => !isValidId(id))
      ) {
        console.error("[Socket markAsRead] Invalid messageIds array provided by reader:", readerId);
        return socket.emit("error", { message: "Invalid messageIds" });
      }

      // Update matching messages to 'read'
      await Message.updateMany(
        { _id: { $in: messageIds }, receiverId: readerId },
        { $set: { status: "read" } }
      );

      // Fetch senders of marked messages
      const messages = await Message.find(
        { _id: { $in: messageIds } },
        { senderId: 1 }
      ).lean();

      const senderMap = new Map();
      for (const msg of messages) {
        const senderIdStr = String(msg.senderId);
        if (!senderMap.has(senderIdStr)) senderMap.set(senderIdStr, []);
        senderMap.get(senderIdStr).push(msg._id);
      }

      // Notify senders that messages were read
      for (const [sId, msgIds] of senderMap.entries()) {
        io.to(sId).emit("messagesRead", {
          messageIds: msgIds,
          readerId
        });
      }
    } catch (error) {
      console.error("[Socket markAsRead Error]:", error);
      socket.emit("error", { message: error.message || "Failed to mark messages as read" });
    }
  });

  // 6. Clean up socket mappings on disconnect
  socket.on("disconnect", () => {
    if (onlineUsers.has(userId)) {
      const userSockets = onlineUsers.get(userId);
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        onlineUsers.delete(userId);
      }
    }
    console.log(`[Socket Chat Disconnected] User ID: ${userId}, Socket ID: ${socket.id}`);
  });
}

module.exports = chatSocket;
module.exports.onlineUsers = onlineUsers;
module.exports.isUserOnline = isUserOnline;
