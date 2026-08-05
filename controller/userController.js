const User = require("../model/userModel");
const { logAction } = require("../utils/logger");

exports.getAllUsers = async (req, res) => {
  try {
   
    // if (req.user.role !== "superadmin") {
    //   return res.status(403).json({ success: false, message: "Access denied. Only superadmin can access this resource." });
    // }

    const users = await User.find().select("username"); 
    if(!users){
     return res.status(404).json({message:"user not found"});
    }

    try {
      await logAction({
        userId: req.user?._id || req.user?.id,
        userType: req.user?.role || 'User',
        action: 'GET_ALL',
        module: 'User',
        recordId: null,
        oldData: null,
        newData: null,
        ipAddress: req.ip,
        userAgent: req.headers ? req.headers['user-agent'] : null,
        apiEndpoint: req.originalUrl,
        requestMethod: req.method,
        status: 'SUCCESS'
      });
    } catch (logError) {
      console.error("Audit log failed for getAllUsers:", logError);
    }

    return res.status(200).json({ success: true, data: users });
    
  } catch (error) {
    try {
      await logAction({
        userId: req.user?._id || req.user?.id,
        userType: req.user?.role || 'System',
        action: 'GET_ALL',
        module: 'User',
        recordId: null,
        status: 'FAILED',
        ipAddress: req.ip,
        userAgent: req.headers ? req.headers['user-agent'] : null,
        apiEndpoint: req.originalUrl,
        requestMethod: req.method,
        error: error.message
      });
    } catch (logErr) {}

    console.error("Error fetching users:", error);
    return res.status(500).json({ success: false, message: "Server Error" + error.message });
  }
};
