const mongoose = require("mongoose");
const { maintenanceDB } = require("../database/database");
const Schema = mongoose.Schema;

const ServiceDetailSchema = new Schema({
  serviceDate: {
    type: Date,
  },
  serviceCenter: {
    type: String,
  },
  serviceType: {
    type: String,
  },
  description: {
    type: String
  },
  cost: {
    type: Number
  },
  nextServiceDate: {
    type: Date
  }
}, { _id: false });

const ExtendedVehicleInfoSchema = new Schema({
  device_id: {
    type: Schema.Types.ObjectId,
    ref: 'Device'  // Logical reference to the vehicle in credenceDB
  },
  assignedTyres: [
    {
      tyre: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tire",
      },
      wheelPosition: {
        type: String,
        // required: [true, "Wheel position is required"],
        trim: true,
      },
    },
  ],
  serviceDetails: [ServiceDetailSchema], // Array of service records
  documents: [
    {
      category: {
        type: String,
        enum: ["PUC", "RC", "Insurance", "Fitness Certificate"],
        required: true
      },
      issueDate: {
        type: Date,

        validate: {
          validator: function (value) {
            return value <= new Date();
          },
          message: "Issue date cannot be in the future",
        }
      },
      expiryDate: {
        type: Date,

        validate: {
          validator: function (value) {
            return value > this.issueDate;
          },
          message: "Expiry date must be after issue date",
        }
      },
      file: {
        filename: { type: String, required: true },
        data: { type: Buffer, required: true },
        contentType: { type: String, required: true },
      },
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }
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

const ExtendedVehicleInfo = maintenanceDB.model('ExtendedVehicleInfo', ExtendedVehicleInfoSchema);
module.exports = ExtendedVehicleInfo;