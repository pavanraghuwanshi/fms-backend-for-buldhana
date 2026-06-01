const { maintenanceDB } = require("../database/database");
const mongoose = require("mongoose");
const serviceSchema = mongoose.Schema({
     vehicleId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Device"
     },
     vehicleName:{
          type:String,
     },
     driverId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Driver"
     },
     trip: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Trip"
     },
     date: {
          type: Date,
          required: [true, "date is required"]
     },
     serviceType: {
          type: String,
          required: [true, "service type required"]
     },
     serviceImg: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ServiceImage"
     },
     expenseId:{
          type:mongoose.Schema.Types.ObjectId,
          ref:"Vehicleexpense"
     },
     description: {
          type: String,
     },
     location: {
          type: String,
     },
     lat: {
          type: String,
     },
     long: {
          type: String,
     },
     vendor: {
          type: String,
          required:["true", "vendor name is required "]
     },
     amount: {
          type: Number,
          required: [true, "amount required"]
     },
     paymentMode: {
          type: String,
          required: [true, "payment mode required"]
     },
     lastService: {
          type: Number
     },
     nextServiceDue: {
          type: Number
     }
}, { timestamps: true });
const Service = maintenanceDB.model("Services", serviceSchema);
module.exports = Service;

