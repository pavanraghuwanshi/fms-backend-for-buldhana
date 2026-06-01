const mongoose = require("mongoose");
const { maintenanceDB } = require("../database/database");

const vehicleDocumentSchema = new mongoose.Schema(
  {
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Device",
      unique: true,
      required: [true, "Vehicle is required please select vehicle"],
    },
    vehicleName: {
      type: String,
      unique: true,
      required: [true, "Vehicle Name is required please select vehicle"],
    },
    documents: {
      Insurance: {
        issueDate: Date,
        expiryDate: Date,
        companyName: String,
        image: {
          base64Data: String,
          contentType: String,
        },
      },
      rc: {
        issueDate: Date,
        expiryDate: Date,
        companyName: String,
        image: {
          base64Data: String,
          contentType: String,
        },
      },
      puc: {
        issueDate: Date,
        expiryDate: Date,
        companyName: String,
        image: {
          base64Data: String,
          contentType: String,
        },
      },
      fitnessCertificate: {
        issueDate: Date,
        expiryDate: Date,
        companyName: String,
        image: {
          base64Data: String,
          contentType: String,
        },
      },
    },
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

const VehicleDocument = maintenanceDB.model("VehicleDocument", vehicleDocumentSchema);
module.exports = VehicleDocument;
