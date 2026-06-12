import mongoose from "mongoose";

const dailyBuiltySchema = new mongoose.Schema(
  {
    tpNo: {
      type: String,
      required: true,
    },

    supervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "supervisorModel",
    },

    supervisorModel: {
      type: String,
      required: true,
      enum: ["School", "Branch", "BranchGroup"],
    },

    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
    },

    consignerName: {
      type: String,
      required: true,
      trim: true,
    },

    consigneeName: {
      type: String,
      required: true,
      trim: true,
    },

    pickupLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: true,
    },

    destinationLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: true,
    },

    vehicleNumber: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    grossVehicleWeight: {
      type: Number,
      required: true,
    },

    products: [
      {
        productName: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
        unit: {
          type: String,
          required: true,
        },
      },
    ],

    remark: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["Created", "Completed", "Cancelled"],
      default: "Created",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    createdByRole: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("DailyBuilty", dailyBuiltySchema);