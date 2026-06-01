const mongoose = require("mongoose");
const { credenceDB } = require("../database/database");

const branchSchema = new mongoose.Schema({
  branchGroupName: {
    type: String,
    required: true
  },

  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "School",
    required: true
  },

  AssignedBranch: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Branch"
  }],

  mobileNo: {
    type: String,
    default: ""
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
    default: ""
  },

  email: {
    type: String,
    default: ""
  },

  role: {
    type: String,
    default: "branchGroup"
  },

  Active: {
    type: Boolean,
    default: true
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

  Notification: { type: Boolean, default: true },

  fcmToken: [{ type: String, default: null }],

  createdAt: {
    type: Date,
    default: () => new Date(new Date().getTime() + (5.5 * 60 * 60 * 1000))
  }

});

module.exports = credenceDB.model("BranchGroup", branchSchema);