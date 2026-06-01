const mongoose = require("mongoose");
// const { encrypt, decrypt } = require('./cryptoUtils'); 
const { credenceDB } = require("../database/database");

const branchSchema = new mongoose.Schema({
  branchName: {
    type: String,
    required: true
  },
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    // required: true
  },
  mobileNo:{
    type: String,
    // required: [true, 'Contact number is required'],
    match: [/^\d{10}$/, 'Contact number must be 10 digits'],
    validate: {
      validator: function (v) {
        return /^[6-9]\d{9}$/.test(v);
      },
      message: props => `${props.value} is not a valid contact number!`
    }
  },
username: {
  type: String,
  required: true,
  unique: true,
  lowercase: true,
  trim: true
  },
  password:{
    type: String,
    default: ''
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
  email:{
    type: String,
    default: ''
  },
  role: {
    type: String,  default: 'branch'
  },
  subscriptionExpirationDate:{
    type: Date,
    default: null
  },
  Active: {
    type: Boolean,
    default: true
  },

  fcmToken: [{ type: String, default: null }],
  createdAt: { type: Date, default: () => new Date(new Date().getTime() + (5.5 * 60 * 60 * 1000))},
  lastNotifiedDate: {
     type: Date, 
     default: null 
    },
notificationsEnabled: {
  geofence: { type: Boolean, default: false },
  eta: { type: Boolean, default: false },
  vehicleStatus: { type: Boolean, default: false },
  overspeed: { type: Boolean, default: false },
  sos: { type: Boolean, default: false },
  busWiseTrip: { type: Boolean, default: false }
},
Notification:{ type: Boolean, default: true },



});




module.exports = credenceDB.model("Branch", branchSchema);