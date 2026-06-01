const { maintenanceDB, credenceDB } = require("./database/database");

const express = require("express");
const router = require("./routes/routes");
const cors = require("cors");
require("dotenv").config();
const compression = require('compression');

const http = require("http");
const initSockets = require("./sockets/sockets");

const app = express();
const server = http.createServer(app);
app.use(express.json());
app.use(compression());
const path = require('path');
require('./utils/cronUtil');


//routes
PORT = process.env.PORT || 5000;
app.use(cors({ origin: "*", }));

app.use("/api", router);


app.get('/', (req, res) => {
  res.send('Server is running on port 5000')
})


app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "public", "uploads"))
);


initSockets(server);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
