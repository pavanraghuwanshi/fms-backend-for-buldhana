const mongoose = require("mongoose");
require("dotenv").config();

const maintenanceDB = mongoose.createConnection(
  process.env.MONGODB_URL_MAINTENANCE
);
maintenanceDB.on("connected", () => console.log("Connected to MaintenanceDB"));
maintenanceDB.on("error", (err) =>
  console.error("Error in MaintenanceDB:", err.message)
);

const credenceDB = mongoose.createConnection(process.env.MONGODB_URL_CREDENCE);
credenceDB.on("connected", () => console.log("Connected to credenceDB"));
credenceDB.on("error", (err) =>
  console.error("Error in credenceDB:", err.message)
);

module.exports = { maintenanceDB, credenceDB };
