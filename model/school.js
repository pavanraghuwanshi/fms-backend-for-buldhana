const mongoose = require("mongoose");
// const { encrypt, decrypt } = require('./cryptoUtils'); 
const { credenceDB } = require("../database/database");
// Define the schema for the School model
const schoolSchema = new mongoose.Schema({
  schoolName: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  mobileNo: {
    type: String
  },
  assignedCompany: {
    type: String,
    enum: ["HBGadgets", "StealthTrack", "ParentsEye"],
    default: "HBGadgets"
  },
  access: {
    master: {
      route: { type: Boolean, default: false },
      geofence: { type: Boolean, default: false },
      driver: { type: Boolean, default: false }
    },

    reports: {
      status: { type: Boolean, default: false },
      history: { type: Boolean, default: false },
      stoppageSummary: { type: Boolean, default: false },
      ePoliceReport: { type: Boolean, default: false },
      stop: { type: Boolean, default: false },
      travel: { type: Boolean, default: false },
      trip: { type: Boolean, default: false },
      idle: { type: Boolean, default: false },
      alert: { type: Boolean, default: false },
      routeReport: { type: Boolean, default: false }
    }
  },
  role: {
    type: String,
    default: "school"
  },
  Active: {
    type: Boolean,
    default: true
  },
  fcmToken: [{ type: String, default: null }],
  Notification: { type: Boolean, default: true },
  subscriptionOverrides: [
    {
      modelName: { type: String, required: true },
      customPrice: { type: Number, required: true },
    }
  ],

}, {
  versionKey: false,
  timestamps: true
});


module.exports = credenceDB.model("School", schoolSchema);