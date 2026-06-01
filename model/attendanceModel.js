const { maintenanceDB } = require("../database/database");
const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
    },
    status: {
      type: String,
      enum: ["Present", "Absent", "On Leave"],
      default: "Present",
    },
    lat: { type: Number },
    long: { type: Number },
    attendanceImageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Image_attendance"
    },
    endLat:{ type: Number },
    endLong:{ type: Number },
    checkoutTime:{ type: String }
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

const Attendance = maintenanceDB.model("Attendance", attendanceSchema);
module.exports = Attendance;