const mongoose = require("mongoose");
const { maintenanceDB } = require("../database/database");

const fcmTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'userType' 
  },
  userType: {
    type: String,
    required: true,
    enum: ['vendor', 'driver', 'user', 'superadmin', 'worker'] 
  },
  deviceId: {
    type: String,
    required: true
  },
  fcmToken: {
    type: String,
    required: true
  }
}, { timestamps: true });


fcmTokenSchema.index({ userId: 1, deviceId: 1 }, { unique: true });
fcmTokenSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 60 * 24 * 60 * 60 });

module.exports = maintenanceDB.model('FcmToken', fcmTokenSchema);