const { credenceDB } = require('../database/database');
const mongoose = require('mongoose');


const deviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    uniqueId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    sim: {
      type: String,
      default: "",
    },
    speed: {
      type: Number,
      default: 0,
    },
    average: {
      type: Number,
      default: 0,
    },
    model: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      default: "",
    },
    deviceId: {
      type: String,
    },
    status: {
      type: String,
    },
    lastUpdate: {
      type: String,
    },
    positionId: {
      type: String,
    },
    parkingMode: {
      type: Boolean,
      default: false,
    },
    toeingMode: {
      type: Boolean,
      default: false,
    },
    keyFeature: {
      type: Boolean,
      default: true,
    },
    TD: {
      type: Number,
      default: 0,
    },
    Odometer: {
      type: String,
      default: "0"
    },
    TotalKmOfDevice: {
      type: Number
    },
    TDTime: {
      type: Date,
      default: Date.now(),
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
    },
    installationdate: {
      type: Date,
    },
    expirationdate: {
      type: Date,
    },

  },
  {
    timestamps: true,
  }
);

const Device = credenceDB.model('Device', deviceSchema);
module.exports = Device;