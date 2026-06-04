const mongoose = require("mongoose");
const { maintenanceDB } = require("../database/database");

const vehicleDocumentSchema = new mongoose.Schema(
  {
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VehicleMaster",
      unique: true,
      required: [true, "Vehicle is required please select vehicle"],
    },

    vehicleName: {
      type: String,
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
  { timestamps: true }
);

const VehicleDocument = maintenanceDB.model(
  "VehicleDocument",
  vehicleDocumentSchema
);

module.exports = VehicleDocument;