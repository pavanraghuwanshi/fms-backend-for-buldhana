const { maintenanceDB } = require("../database/database");
const mongoose = require("mongoose");
const crypto = require("crypto");

const ENCRYPTION_KEY = "T<i}3s0a2]b\dt6qA@*%_/\`fAvieXbHQg";
const IV_LENGTH = 16; // AES block size

// Encryption function
const encrypt = (text) => {
  const iv = crypto.randomBytes(IV_LENGTH); // Generate a new IV
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'utf-8'), iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Combine IV and encrypted data (separated by a colon)
  return `${iv.toString('hex')}:${encrypted}`;
};

// Decryption function
const decrypt = (encryptedText) => {
  const [ivHex, encrypted] = encryptedText.split(':'); // Extract IV and encrypted data
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'utf-8'), iv);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};



const driverSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Driver Name is required"],
      trim: true,
    },
    contactNumber: {
      type: Number,
      unique: true,
      required: [true, "Contact Number is required"],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please use a valid email address"],
      // required: true,
    },
    isAssigned: {
      type: Boolean,
      default: false,
      index: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    licenseNumber: {
      type: String,
      trim: true,
      //  required: true,
      //   unique: true,
    },
    aadharNumber: {
      type: Number,
      // required: true,
      //  unique: true,
    },
    profileImage: {
      base64Data: String,
      contentType: String,
    },
    licenseImage: {
      base64Data: String,
      contentType: String,
    },
    aadharImage: {
      base64Data: String,
      contentType: String,
    },
    amount: {
      type: Number,
    },
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      unique: true,
    },
    supervisor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    currentVehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Device",
    },
    currentVehicleName: {
      type: String,
    },
    currentTripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
    },
    company: {
      type: String,
    },
    licenseExpiryDate: {
      type: Date,
    },
    fcmToken: { type: [String], default: [] }
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



// Middleware to encrypt the password before saving
driverSchema.pre('save', function (next) {
  if (this.isModified('password')) {
    this.password = encrypt(this.password);
  }
  next();
});

// Method to decrypt the password
driverSchema.methods.getDecryptedPassword = function () {
  return decrypt(this.password);
};


const Driver = maintenanceDB.model("Driver", driverSchema);
module.exports = Driver;