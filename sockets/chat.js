const mongoose = require("mongoose");
const Driver = require("../model/driverModel");
const Message = require("../model/messageModel");
const User = require("../model/userModel");
const sendPushNotification = require("../utils/pushNotification");

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

const onlineUsers = new Map();

function chatSocket(io, socket) {
  const userId = socket.user.id;
  onlineUsers.set(userId, socket.id);

  socket.on("sendMessage", async ({ receiverId, text }) => {
    if (socket.user.role === "driver") receiverId = socket.user.supervisor;
    if (!isValidId(receiverId)) {
      console.error("Invalid receiverId:", receiverId);
      return socket.emit("error", { message: "Invalid user IDs" });
    }

    let message = await Message.create({ senderId: userId, receiverId, text });

    if (onlineUsers.has(receiverId)) {
      message = await Message.findByIdAndUpdate(
        message._id,
        { status: "delivered" },
        { new: true }
      );

      // Send to receiver
      io.to(onlineUsers.get(receiverId)).emit("receiveMessage", message);

      // Notify sender about delivery
      io.to(onlineUsers.get(userId)).emit("messageDelivered", {
        messageId: message._id,
        receiverId
      });
    } else {
      // Receiver offline → send push notification
      const role = socket.user.role;
      if (!role) return socket.emit("error", { message: "User role not found" });
      let receiver = {};

      // Determine receiver model based on sender's role
      if (role === "user") {
        receiver = await Driver.findById(receiverId).select("fcmToken");
      } else if (role === "driver") {
        receiver = await User.findById(receiverId).select("fcmToken").lean();
      }
      if (receiver?.fcmToken?.length > 0) {
        await Promise.allSettled(
          receiver.fcmToken.map(token =>
            sendPushNotification(token, "New Message", text)
          )
        );

        console.log(`Push notification sent to ${receiver.fcmToken.length} devices for user ${receiverId}`);
      } else {
        console.log(`Receiver ${receiverId} has no FCM tokens.`);
      }
    }

    // Always send the message to sender's UI
    io.to(onlineUsers.get(userId)).emit("messageStatus", message);
  });

  // Mark multiple messages as read
  socket.on("markAsRead", async ({ messageIds, readerId }) => {
    if (
      !Array.isArray(messageIds) ||
      messageIds.length === 0 ||
      messageIds.some(id => !isValidId(id)) ||
      !isValidId(readerId)
    ) {
      console.error("Invalid messageIds or readerId:", messageIds, readerId);
      return socket.emit("error", { message: "Invalid IDs" });
    }

    // Update all messages in one go
    await Message.updateMany(
      { _id: { $in: messageIds } },
      { $set: { status: "read" } }
    );

    // Fetch only needed fields
    const messages = await Message.find(
      { _id: { $in: messageIds } },
      { senderId: 1 }
    ).lean();

    // Group by sender to send fewer events
    const senderMap = new Map();
    for (const msg of messages) {
      const senderIdStr = msg.senderId.toString();
      if (!senderMap.has(senderIdStr)) senderMap.set(senderIdStr, []);
      senderMap.get(senderIdStr).push(msg._id);
    }

    // Emit one event per sender
    for (const [senderId, msgIds] of senderMap.entries()) {
      if (onlineUsers.has(senderId)) {
        io.to(onlineUsers.get(senderId)).emit("messagesRead", {
          messageIds: msgIds,
          readerId
        });
      }
    }
  });


  socket.on("disconnect", () => {
    onlineUsers.delete(userId);
  });
}

module.exports = chatSocket;
