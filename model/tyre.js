const mongoose = require("mongoose");
const { maintenanceDB } = require('../database/database');

const tireSchema = new mongoose.Schema(
  {
  vehicleId:{
    type:mongoose.Schema.Types.ObjectId,
    ref: "Device",
    required:[true,"Vehicle Id is Required."]
  },
  expenseId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Vehicleexpense"
  },
  category:{
    type:String,
    required:[true, "Category is Requuired."],
  },
  position:{
    type:String,
    required:[true,"Tyre Position is Required."]
  },
  tyreSerialNumber:{
    type:String,
    required:[true,"Serial Number is Required."]
  },  
  brandName:{
    type:String,
    required:[true, "Tyre Brand name is Required."]
  },
  tyreStatus:{
    type:String,
    required:[true, "Tyre Status is Required."]
  },
  installationDate:{
    type:String,
    required:[true, "Installation Date is required."]
  },
  vendorName:{
    type:String,
    required:[true,"Shop Name or Vendor Name is required."]
  },
  location:{
    type:String,
    required:[true, "Enter the Location"]
  },
  lat:{
    type:String
  },
  long:{
    type:String
  },
  tyreSize:{
    type:String,
    required:[true, "Enter Tyre Size."]
  },
  billImg:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"TyreBillImage"
  },
  amount:{
    type:Number,
    required:[true,"Enter the Amount."]
  },
  paymentMode:{
    type:String,
    required:[true, "Enter the Mode Of Payment."]
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

const Tire = maintenanceDB.model("Tire", tireSchema);
module.exports = Tire;
