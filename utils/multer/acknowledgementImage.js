const multer  = require ("multer");
const path = require ("path");
const fs = require ("fs");

function ensureDir(dir) {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (err) {
    console.error("Error creating directory:", err);
  }
}

// 🔹 Storage config

const storage = multer.diskStorage({
    destination: (req,file,cb)=>{
        const uploadPaath = path.join(
            process.cwd(),
            "public",
            "uploads",
            "AcknowledgementImage"
        );

        ensureDir(uploadPaath);
        cb(null,uploadPaath);  
    },

    filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  }

});

// 🔹 File filter (images only)
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "application/pdf" 
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image and pdf files are allowed"), false);
  }
};

// 🔹 Multer instance
const uploadAcknowledgementImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 3 * 1024 * 1024   //50 KB
  }
});

module.exports = uploadAcknowledgementImage;