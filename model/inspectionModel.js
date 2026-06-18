const mongoose = require("mongoose");
const { maintenanceDB } = require("../database/database");

const inspectionSchema = new mongoose.Schema(
     {
          vehicleId: {
               type: mongoose.Schema.Types.ObjectId,
               ref: "VehicleMaster",
               required: [true, "Vehicle Id is Required"]
          },
          DriverId: {
               type: mongoose.Schema.Types.ObjectId,
               ref: "Driver",
               required: [true, "Driver Id is Required"]
          },
          engineOil: {
               status: {
                    type: Boolean,
                    required: true,
               },
               description: {
                    type: String,
                    default: "No issue"
               },
               Image: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "InspectionImage"
               }
          },
          acCollent: {
               status: {
                    type: Boolean,
                    required: true,
               },
               description: {
                    type: String,
                    default: "No issue"
               },
               Image: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "InspectionImage"
               }
          },
          sparkPlug: {
               status: {
                    type: Boolean,
                    required: true,
               },
               description: {
                    type: String,
                    default: "No issue"
               },
               Image: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "InspectionImage"
               }
          },
          airFilter: {
               status: {
                    type: Boolean,
                    required: true,
               },
               description: {
                    type: String,
                    default: "No issue"
               },
               Image: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "InspectionImage"
               }
          },
          breakFluid: {
               status: {
                    type: Boolean,
                    required: true,
               },
               description: {
                    type: String,
                    default: "No issue"
               },
               Image: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "InspectionImage"
               }
          },
          transmissionFluid: {
               status: {
                    type: Boolean,
                    required: true,
               },
               description: {
                    type: String,
                    default: "No issue"
               },
               Image: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "InspectionImage"
               }
          },
          powerStairingFluid: {
               status: {
                    type: Boolean,
                    required: true,
               },
               description: {
                    type: String,
                    default: "No issue"
               },
               Image: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "InspectionImage"
               }
          },
          windShieldWasherFluid: {
               status: {
                    type: Boolean,
                    required: true,
               },
               description: {
                    type: String,
                    default: "No issue"
               },
               Image: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "InspectionImage"
               }
          },
          tyrePressure: {
               status: {
                    type: Boolean,
                    required: true,
               },
               description: {
                    type: String,
                    default: "No issue"
               },
               Image: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "InspectionImage"
               }
          },
          tyreAlignment: {
               status: {
                    type: Boolean,
                    required: true,
               },
               description: {
                    type: String,
                    default: "No issue"
               },
               Image: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "InspectionImage"
               }
          },
          batteryCharge: {
               status: {
                    type: Boolean,
                    required: true,
               },
               description: {
                    type: String,
                    default: "No issue"
               },
               Image: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "InspectionImage"
               }
          },
          wiperBlades: {
               status: {
                    type: Boolean,
                    required: true,
               },
               description: {
                    type: String,
                    default: "No issue"
               },
               Image: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "InspectionImage"
               }
          },
          suspensionAndStairing: {
               status: {
                    type: Boolean,
                    required: true,
               },
               description: {
                    type: String,
                    default: "No issue"
               },
               Image: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "InspectionImage"
               }
          },
          underbody: {
               status: {
                    type: Boolean,
                    required: true,
               },
               description: {
                    type: String,
                    default: "No issue"
               },
               Image: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "InspectionImage"
               }
          },
          exaustSystem: {
               status: {
                    type: Boolean,
                    required: true,
               },
               description: {
                    type: String,
                    default: "No issue"
               },
               Image: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "InspectionImage"
               }
          },
          warningLights: {
               status: {
                    type: Boolean,
                    required: true,
               },
               description: {
                    type: String,
                    default: "No issue"
               },
               Image: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "InspectionImage"
               }
          },
          headLights: {
               status: {
                    type: Boolean,
                    required: true,
               },
               description: {
                    type: String,
                    default: "No issue"
               },
               Image: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "InspectionImage"
               }
          },
          indicator: {
               status: {
                    type: Boolean,
                    required: true,
               },
               description: {
                    type: String,
                    default: "No issue"
               },
               Image: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "InspectionImage"
               }
          },
          tripId: {
               type: mongoose.Schema.Types.ObjectId,
               ref: "Trip"
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
     })


const Inspection = maintenanceDB.model("Inspection", inspectionSchema);
module.exports = Inspection