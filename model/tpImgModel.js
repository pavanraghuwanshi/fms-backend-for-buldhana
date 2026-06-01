const { maintenanceDB } = require("../database/database");
const mongoose = require("mongoose");

const tpImgSchema = new mongoose.Schema(
  {
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Device",
      required: true,
    },
    vehicleName: {
      type: String,
      required: true,
    },
    tpImg: [
      {
        data: Buffer,
        contentType: String,
        filename: String,
      },
    ],
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

const Tpimg = maintenanceDB.model("Tpimg", tpImgSchema);
module.exports = Tpimg;