// models/materialOwner.model.js

const mongoose = require("mongoose");
const { maintenanceDB } = require("../database/database");

const materialOwnerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    contactNumber: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    address: {
      type: String,
      trim: true,
    },
    supervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true 
    },
  },
  { timestamps: true }
);



const MaterialOwner = maintenanceDB.model("MaterialOwner", materialOwnerSchema);
module.exports = MaterialOwner;
