const { maintenanceDB } = require("../database/database");
const mongoose = require("mongoose");

const companySchema = new mongoose.Schema(
    {
        companyName: { type: String, required: true, unique: true },
        email: { type: String, required: true, unique: true },
        address: { type: String, required: true },
        mobileNumber: { type: Number, required: true },
        officeNumber: { type: Number, required: true },
        gstNumber: { type: String, required: true, unique: true },
        supervisorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        digitalSignatureId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "DigitalSignature",
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

const Company = maintenanceDB.model("Company", companySchema);
module.exports = Company;
