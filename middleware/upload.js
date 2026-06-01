const multer = require('multer');

// Configure Multer for handling files in memory
const storage = multer.memoryStorage();
const upload = multer({
    storage,
});

module.exports = upload
// Define fields for multiple file uploads
// module.exports = upload.fields([
//     { name: 'profileImage', maxCount: 1 },
//     { name: 'licenseImage', maxCount: 1 },
//     { name: 'aadharImage', maxCount: 1 },
//     { name: 'tpImage', maxCount: 1}
// ]);
