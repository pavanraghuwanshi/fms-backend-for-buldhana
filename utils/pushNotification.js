const admin = require("./firebase");

async function sendPushNotification(token, title, body) {
  try {
    await admin.messaging().send({
      token,
      notification: { title, body }
    });
    console.log("📩 Push sent to", token);
  } catch (err) {
    console.error("❌ Push error:", err);
  }
}

module.exports = sendPushNotification;
