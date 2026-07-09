const mongoose = require('mongoose');
const { maintenanceDB } = require('../database/database');

/**
 * Helper to generate standard CRUD permissions
 */
const createCrudPermissions = () => ({
  create: { type: Boolean, default: false },
  read: { type: Boolean, default: false },
  update: { type: Boolean, default: false },
  delete: { type: Boolean, default: false }
});

const WorkerRoleSchema = new mongoose.Schema({
  assignedWorkers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Worker",
    index: true
  }],

  // 1. Static Core Permissions (Validated and Structured)
  permissions: {
    masters: {
      driver: createCrudPermissions(),
      vehicle: createCrudPermissions(),
      trip: createCrudPermissions(),
      location: createCrudPermissions(),
      company: createCrudPermissions(),
      materialOwner: createCrudPermissions(),
      vendor: createCrudPermissions(),
      employee: createCrudPermissions(),
      consignor: createCrudPermissions(),
      consignee: createCrudPermissions(),
      transporter: createCrudPermissions(),
      commAgent: createCrudPermissions(),
      category: createCrudPermissions(),
      attendance: createCrudPermissions(),
      leave: createCrudPermissions(),
      zone: createCrudPermissions(),
      customer: createCrudPermissions()
    },
    reports: {
      salary: createCrudPermissions(),
      driverExp: createCrudPermissions(),
      vehicleExp: createCrudPermissions(),
      dailyLog: createCrudPermissions(),
      serviceLog: createCrudPermissions(),
      inspection: createCrudPermissions(),
      vendorsRep: createCrudPermissions(),
      supervisorTPRep: createCrudPermissions(),
      tpTripLogs: createCrudPermissions(),
    },
    dailyTrips: createCrudPermissions(),
    goodReceipts: {
      rail: createCrudPermissions(),
      road: createCrudPermissions()
    },
    dailyPass: {
      builty: createCrudPermissions()
    },
    transportPass: {
      receipt: createCrudPermissions(),
      builty: createCrudPermissions(),
      dailyPassbuilty: createCrudPermissions()
    },
    warehouse: {
      product: createCrudPermissions(),
      railHead: createCrudPermissions(),
      inventory: createCrudPermissions(),
      dailyproduct: createCrudPermissions()
    },
    tickets: {
      raise: createCrudPermissions(),
      answer: createCrudPermissions()
    },
    chat: {
      read: { type: Boolean, default: false }
    }
  },

  // 2. Dynamic Permissions: ADD NEW CATEGORIES HERE ON THE FLY
  // Use this for 'feedbackes' or any future modules.
  customPermissions: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  minimize: false
});

const WorkerRole = maintenanceDB.model('WorkerRole', WorkerRoleSchema);
module.exports = WorkerRole;