const mongoose = require("mongoose");
const crypto = require("crypto");
const { credenceDB } = require("../database/database");

const ENCRYPTION_KEY = "T<i}3s0a2]bdt6qA@*%_/`fAvieXbHQg";
const IV_LENGTH = 16; // AES block size

// Encryption function
const encrypt = (text) => {
  const iv = crypto.randomBytes(IV_LENGTH); // Generate a new IV
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY, "utf-8"),
    iv
  );

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  // Combine IV and encrypted data (separated by a colon)
  return `${iv.toString("hex")}:${encrypted}`;
};

// Decryption function
const decrypt = (encryptedText) => {
  const [ivHex, encrypted] = encryptedText.split(":"); // Extract IV and encrypted data
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY, "utf-8"),
    iv
  );

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
};

const userSchema = new mongoose.Schema({
  custName: { type: String },
  email: { type: String },
  password: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  mobile: { type: String },
  contactPerson: { type: String },
  groupsAssigned: [
    { type: mongoose.Schema.Types.ObjectId, ref: "Group", default: null },
  ],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  address: { type: String },
  status: { type: String },
  added: { type: String },
  inactiveDate: { type: String },
  timezone: { type: String },
  notification: { type: Boolean, default: false },
  devices: { type: Boolean, default: false },
  driver: { type: Boolean, default: false },
  groups: { type: Boolean, default: false },
  category: { type: Boolean, default: false },
  model: { type: Boolean, default: false },
  users: { type: Boolean, default: false },
  report: { type: Boolean, default: false },
  stop: { type: Boolean, default: false },
  travel: { type: Boolean, default: false },
  trips: { type: Boolean, default: false },
  geofence: { type: Boolean, default: false },
  geofenceReport: { type: Boolean, default: false },
  maintenance: { type: Boolean, default: false },
  preferences: { type: Boolean, default: false },
  // status: { type: Boolean,default:false},
  distance: { type: Boolean, default: false },
  history: { type: Boolean, default: false },
  sensor: { type: Boolean, default: false },
  idle: { type: Boolean, default: false },
  alerts: { type: Boolean, default: false },
  vehicle: { type: Boolean, default: false },
  devicelimit: { type: Boolean, default: false },
  dataLimit: { type: Number },
  entriesCount: { type: Number, default: 0 },
  roles: [
    {
      role: { type: Number },
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      _id: false,
    },
  ],
});

// Middleware to encrypt the password before saving
userSchema.pre("save", function (next) {
  if (this.isModified("password")) {
    this.password = encrypt(this.password);
  }
  next();
});

// Method to decrypt the password
userSchema.methods.getDecryptedPassword = function () {
  return decrypt(this.password);
};

const User = credenceDB.model("User", userSchema);
module.exports = User;
