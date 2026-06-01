const mongoose = require("mongoose");
const { maintenanceDB } = require('../database/database');


const salarySchema = new mongoose.Schema(
  {
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true
    },
    supervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    basicPay: {
      type: Number,
      required: true
    },
    overtime: {
      type: Number,
      default: 0
    },
    incentives: {
      type: Number,
      default: 0
    },
    deductions: {
      type: Number,
      default: 0
    },
    netPay: {
      type: Number,
      required: true
    },
    date:{
      type: Date
    }
  },

  {
    timestamps: {
      currentTime: () => {
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        return new Date(now.getTime() + istOffset);
      },
    },
  }
);

// Automatically calculate netPay before saving
// salarySchema.pre("save", function (next) {
//   this.netPay = this.basicPay + this.overtime + this.incentives - this.deductions;
//   next();
// });

const Salary = maintenanceDB.model("Salary", salarySchema);
module.exports = Salary;