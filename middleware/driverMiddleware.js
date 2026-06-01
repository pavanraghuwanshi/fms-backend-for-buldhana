const jwt = require("jsonwebtoken");
const Driver = require("../model/driverModel");

exports.driverMiddleware = async (req, res, next) => {
  try {
    const token = req.headers["authorization"]?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Access token is required" });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    let user = await Driver.findById(decoded.id);
    if (!user) return res.status(404).json({ message: "Driver not found" });
    
    req.user = { id: user._id, role: "driver" };
    next();
  } catch (error) {
    return res.status(403).json({ message: "Invalid token" });
  }
};
