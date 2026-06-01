const { credenceDB } = require('../database/database');
const mongoose = require('mongoose');

const historyschema = new mongoose.Schema({
  id: Number,
  attributes: {
    event: Number,
    sat: Number,
    pdop: Number,
    hdop: Number,
    operator: String,
    ignition: Boolean,
    alarm: String,
    charge: Boolean,
    power: Number,
    battery: Number,
    emergency: Boolean,
    input: Number,
    output: Number,
    odometer: Number,
    distance: Number,
    totalDistance: Number,
    motion: Boolean,
  },
  deviceId: Number,
  protocol: String,
  serverTime: Date,
  deviceTime: Date,
  fixTime: Date,
  outdated: Boolean,
  valid: Boolean,
  latitude: Number,
  longitude: Number,
  altitude: Number,
  speed: Number,
  course: Number,
  address: String,
  accuracy: Number,
  network: {
    radioType: String,
    considerIp: Boolean,
    cellTowers: [
      {
        cellId: Number,
        locationAreaCode: Number,
        mobileCountryCode: Number,
        mobileNetworkCode: Number,
        signalStrength: Number,
        _id: false,
      },
    ],
  },
  geofenceIds: [Number],
  createdAt: { type: Date, default: () => new Date(new Date().getTime() + (5.5 * 60 * 60 * 1000))}
}, { versionKey: false });

const History = credenceDB.model('History', historyschema);
module.exports = History;