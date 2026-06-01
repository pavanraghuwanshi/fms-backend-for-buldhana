const { maintenanceDB } = require("../database/database");
const mongoose = require("mongoose");
const serviceOdometerSchema = mongoose.Schema({
     vehicleId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Device"
     },
     driverId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Driver"
     },
     trip: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Trip"
     },
     serviceId:{
          type:mongoose.Schema.Types.ObjectId,
          ref:"Services"
     },
     currentOdometer: {
          type: Number,
          default: 0
     },
     nextServiceDue: {
          type:Number,
          default:0
     },
     lastService: {
          type: Number,
          default: 0
     }
});
const ServiceOdometer = maintenanceDB.model("ServiceOdometer", serviceOdometerSchema);
module.exports = ServiceOdometer;
