const mongoose = require('mongoose');
const { maintenanceDB } = require("../database/database");

const digitalSignatureSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: true
    },
    signatureImage: {
        type: String,
        required: true
    }
},{
     versionKey: false,
    });


const DigitalSignature = maintenanceDB.model('DigitalSignature', digitalSignatureSchema);
module.exports = DigitalSignature;