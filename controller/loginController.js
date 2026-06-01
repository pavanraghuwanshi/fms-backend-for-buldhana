const Driver = require("../model/driverModel");
const jwt = require("jsonwebtoken");

exports.driverLogin = async (req, res) => {
  const { contactNumber, password } = req.body;

  try {
    const driver = await Driver.findOne({ contactNumber });
    if (!driver) return res.status(404).json({ message: "Driver not found" });

    if (password !== driver.getDecryptedPassword()) return res.status(401).json({ message: "Invalid contact number or password" });

    const token = jwt.sign(
      { id: driver._id,supervisor: driver.supervisor , contactNumber: driver.contactNumber, role: "driver" },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    return res.status(200).json({
      message: "Login successful",
      token,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" + error.message });
  }
};
