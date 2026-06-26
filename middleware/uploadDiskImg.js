const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const createUploader = (folderName) => {
  const UPLOAD_DIR = path.join(__dirname, `../public/uploads/${folderName}`);
  
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      }
      cb(null, UPLOAD_DIR);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = crypto.randomBytes(8).toString("hex");
      const timestamp = Date.now();
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${file.fieldname}-${timestamp}-${uniqueSuffix}${ext}`);
    }
  });

  const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPG, PNG, WEBP, and PDF are allowed."), false);
    }
  };

  return multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024,
    }
  });
};

module.exports = createUploader;