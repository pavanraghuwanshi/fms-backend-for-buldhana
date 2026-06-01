const mongoose = require("mongoose");
const { credenceDB } = require("../database/database");

const superAdminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    username: { type: String, required: true },
  });

const SuperAdmin = credenceDB.model("SuperAdmin", superAdminSchema);
module.exports = SuperAdmin;