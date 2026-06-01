const mongoose = require('mongoose');
const { maintenanceDB } = require('../database/database');

const serviceImageSchema = new mongoose.Schema({
     base64Data: String,
     contentType: String,
},
     {
          versionKey: false,
     });

const ServiceImage = maintenanceDB.model('ServiceImage', serviceImageSchema);
module.exports = ServiceImage
