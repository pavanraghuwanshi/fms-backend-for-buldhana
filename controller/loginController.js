const Driver = require("../model/driverModel");
const Vendor = require("../model/vendor");
const jwt = require("jsonwebtoken");

exports.userLogin = async (req, res) => {
  const { contactNumber } = req.body;

  try {
    const isDriver = await Driver.exists({ contactNumber });
    if (isDriver) return handleDriverLogin(req, res);

    const isVendor = await Vendor.exists({ mobile: contactNumber });
    if (isVendor) return handleVendorLogin(req, res);

    return res.status(404).json({ message: "User not found" });
  } catch (error) {
    console.error("Login Routing Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


const handleDriverLogin = async (req, res) => {
  const { contactNumber, password } = req.body;

  try {
    const driver = await Driver.findOne({ contactNumber });
    if (!driver) return res.status(404).json({ message: "Driver not found" });

    if (password !== driver.getDecryptedPassword()) return res.status(401).json({ message: "Invalid contact number or password" });

    const token = jwt.sign(
      { id: driver._id, supervisor: driver.supervisor, contactNumber: driver.contactNumber, role: "driver" },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    return res.status(200).json({
      message: "Login successful",
      token,
      role: "driver"
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" + error.message });
  }
};


const handleVendorLogin = async (req, res) => {
  try {
    const { contactNumber, password, deviceId } = req.body;
    if (!contactNumber) {
      return res.status(400).json({ message: "mobile is required" });
    }

    if (!password) {
      return res.status(400).json({ message: "password is required" });
    }

    const vendor = await Vendor.findOne({ mobile: contactNumber });

    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    if (vendor.status !== "Active") {
      return res.status(403).json({ message: "Vendor account is inactive" });
    }

    if (!vendor.isLoginAllowed) {
      return res.status(403).json({ message: "Vendor login is disabled" });
    }

    if (vendor.password !== password) {
      return res.status(400).json({ message: "Invalid password" });
    }

    if (deviceId) {
      vendor.deviceId = deviceId;
      await vendor.save();
    }
    const token = jwt.sign(
      { id: vendor._id, role: "vendor", supervisorId: vendor.supervisorId, supervisorModel: vendor.supervisorModel },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );
    
    return res.status(200).json({
      message: "Vendor login successful",
      token,
      role: "vendor",
   
    });

  } catch (error) {
    return res.status(500).json({
      message: "Error vendor login",
      error: error.message,
    });
  }
};


