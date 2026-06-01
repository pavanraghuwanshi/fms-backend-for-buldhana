const User = require("../model/userModel");

exports.getAllUsers = async (req, res) => {
  try {
   
    // if (req.user.role !== "superadmin") {
    //   return res.status(403).json({ success: false, message: "Access denied. Only superadmin can access this resource." });
    // }

    const users = await User.find().select("username"); 
    if(!users){
     return res.status(404).json({message:"user not found"});
    }
    return res.status(200).json({ success: true, data: users });
    
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({ success: false, message: "Server Error" + error.message });
  }
};
