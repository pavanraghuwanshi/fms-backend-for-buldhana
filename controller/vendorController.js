const Vendor = require("../model/vendor");
const Builty = require("../model/builtyModel");
const BuiltyCounter = require("../model/builtyCounterModel");
const VehicleMaster = require("../model/maintenanceDevice.model");
const Driver = require("../model/driverModel");
const roleModelMap = {
  school: "School",
  branch: "Branch",
  branchGroup: "BranchGroup",
};

const applyHierarchy = (req, payload) => {
  const role = req.user.role;
  const roleType = req.user.roleType;

  if (role === "user") {
    payload.supervisorId = req.user.id;
    payload.supervisorModel = roleModelMap[roleType];
  }

  if (role === "worker") {
    payload.workerId = req.user.id;
    payload.supervisorId = req.user.supervisor;
    payload.supervisorModel = roleModelMap[roleType] || req.user.supervisorModel;
  }

  return payload;
};


// CREATE VENDOR
exports.createVendor = async (req, res) => {
  try {
    if (!["superadmin", "user", "worker"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const payload = applyHierarchy(req, req.body);

    if (!payload.supervisorId) {
      return res.status(400).json({ message: "supervisorId is required" });
    }

    if (!payload.supervisorModel) {
      return res.status(400).json({ message: "supervisorModel is required" });
    }

    if (!payload.vendorName) {
      return res.status(400).json({ message: "vendorName is required" });
    }

    if (!payload.mobile) {
      return res.status(400).json({ message: "mobile is required" });
    }

    if (!payload.password) {
      return res.status(400).json({ message: "password is required" });
    }

    const exists = await Vendor.findOne({
      mobile: payload.mobile,
      supervisorId: payload.supervisorId,
      supervisorModel: payload.supervisorModel,
    });

    if (exists) {
      return res.status(400).json({ message: "Vendor already exists with this mobile" });
    }

    payload.createdBy = req.user.id;
    payload.createdByRole = req.user.role;

    const vendor = await Vendor.create(payload);

    return res.status(201).json({
      message: "Vendor created successfully",
      vendor,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error creating vendor",
      error: error.message,
    });
  }
};

// GET ALL VENDORS
exports.getVendors = async (req, res) => {
  try {
    if (!["superadmin", "user", "worker"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const {
      page = 1,
      limit = 10,
      search,
      status,
      supervisorId,
    } = req.query;

    const query = {};

    if (req.user.role === "user") {
      query.supervisorId = req.user.id;
    } else if (req.user.role === "worker") {
      query.supervisorId = req.user.supervisor;
    } else if (supervisorId) {
      query.supervisorId = supervisorId;
    }

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { vendorName: { $regex: search, $options: "i" } },
        { contactPerson: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { gstNumber: { $regex: search, $options: "i" } },
        { panNumber: { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [vendors, total] = await Promise.all([
      Vendor.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Vendor.countDocuments(query),
    ]);

    return res.status(200).json({
      message: "Vendors fetched successfully",
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
      vendors,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching vendors",
      error: error.message,
    });
  }
};

// GET VENDOR BY ID
exports.getVendorById = async (req, res) => {
  try {
    if (!["superadmin", "user", "worker"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const query = { _id: req.params.id };

    if (req.user.role === "user") {
      query.supervisorId = req.user.id;
    } else if (req.user.role === "worker") {
      query.supervisorId = req.user.supervisor;
    }

    const vendor = await Vendor.findOne(query);

    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    return res.status(200).json({
      message: "Vendor fetched successfully",
      vendor,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching vendor",
      error: error.message,
    });
  }
};

// UPDATE VENDOR
exports.updateVendor = async (req, res) => {
  try {
    if (!["superadmin", "user", "worker"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const query = { _id: req.params.id };

    if (req.user.role === "user") {
      query.supervisorId = req.user.id;
    } else if (req.user.role === "worker") {
      query.supervisorId = req.user.supervisor;
    }

    const vendor = await Vendor.findOne(query);

    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    const allowedFields = [
      "vendorName",
      "contactPerson",
      "mobile",
      "email",
      "password",
      "deviceId",
      "address",
      "city",
      "state",
      "pincode",
      "gstNumber",
      "panNumber",
      "bankName",
      "accountHolderName",
      "accountNumber",
      "ifscCode",
      "status",
      "isLoginAllowed",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        vendor[field] = req.body[field];
      }
    });

    await vendor.save();

    return res.status(200).json({
      message: "Vendor updated successfully",
      vendor,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error updating vendor",
      error: error.message,
    });
  }
};

// DELETE VENDOR
exports.deleteVendor = async (req, res) => {
  try {
    if (!["superadmin", "user", "worker"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const query = { _id: req.params.id };

    if (req.user.role === "user") {
      query.supervisorId = req.user.id;
    } else if (req.user.role === "worker") {
      query.supervisorId = req.user.supervisor;
    }

    const vendor = await Vendor.findOneAndDelete(query);

    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    return res.status(200).json({
      message: "Vendor deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error deleting vendor",
      error: error.message,
    });
  }
};

// DROPDOWN
exports.getVendorDropdown = async (req, res) => {
  try {
    if (!["superadmin", "user", "worker"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { search, supervisorId } = req.query;

    const query = { status: "Active" };

    if (req.user.role === "user") {
      query.supervisorId = req.user.id;
    } else if (req.user.role === "worker") {
      query.supervisorId = req.user.supervisor;
    } else if (supervisorId) {
      query.supervisorId = supervisorId;
    }

    if (search) {
      query.$or = [
        { vendorName: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } },
      ];
    }

    const vendors = await Vendor.find(query)
      .select("_id vendorName contactPerson mobile email gstNumber")
      .sort({ vendorName: 1 });

    return res.status(200).json({
      message: "Vendor dropdown fetched successfully",
      vendors,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching vendor dropdown",
      error: error.message,
    });
  }
};

// VENDOR LOGIN FOR MOBILE APP
exports.vendorLogin = async (req, res) => {
  try {
    const { mobile, password, deviceId } = req.body;

    if (!mobile) {
      return res.status(400).json({ message: "mobile is required" });
    }

    if (!password) {
      return res.status(400).json({ message: "password is required" });
    }

    const vendor = await Vendor.findOne({ mobile });

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

    return res.status(200).json({
      message: "Vendor login successful",
      vendor,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error vendor login",
      error: error.message,
    });
  }
};

exports.updateFcmToken = async (req, res) => {
  try {
    const { vendorId, deviceId, fcmToken } = req.body;

    if (!deviceId || !fcmToken) {
      return res.status(400).json({ message: "deviceId and fcmToken are required" });
    }

    const vendor = await Vendor.findById(vendorId).select('+fcmTokens');
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });

    const existingDeviceIndex = vendor.fcmTokens.findIndex(
      (item) => item.deviceId === deviceId
    );

    if (existingDeviceIndex !== -1) {
      if (vendor.fcmTokens[existingDeviceIndex].token === fcmToken) {
        return res.status(200).json({ message: "Token already up to date" });
      }
      vendor.fcmTokens[existingDeviceIndex].token = fcmToken;
      vendor.fcmTokens[existingDeviceIndex].createdAt = Date.now();
    } else {
      // Add new device entry
      vendor.fcmTokens.push({ deviceId, token: fcmToken });
    }

    await vendor.save();
    return res.status(200).json({ message: "FCM token updated successfully" });
  } catch (error) {
    console.error("FCM Update Error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

exports.getVendorBuiltys = async (req, res) => {
  try {
    if (req.user.role !== "vendor") {
      return res.status(403).json({ message: "Access denied." });
    }

    // 1. Sanitize/Validate inputs
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10)); // Limit to 100 max per page
    const { search, status } = req.query;

    const query = { vendorId: req.user.id };
    if (status) query.status = status;
    if (search) {

      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { tpNo: { $regex: escapedSearch, $options: "i" } },
        { vehicleNumber: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    const builtys = await Builty.find(query)
      .populate("driverId", "name")
      .select("_id vehicleNumber description driverId") 
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();


    const formattedBuiltys = builtys.map((builty) => ({
      builtyId: builty._id,
      driverName: builty.driverId?.name || "N/A",
      vehicleNumber: builty.vehicleNumber,
      description: builty.description
    }));

    const total = await Builty.countDocuments(query);

    return res.status(200).json({
      message: "Vendor builtys fetched successfully",
      total,
      page,
      limit,
      builtys: formattedBuiltys,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};


exports.saveOrUpdateToken = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.role; 

    const { deviceId, fcmToken } = req.body;

    if (!deviceId || !fcmToken || !userId || !userType) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    await FcmToken.findOneAndUpdate(
      {
        userId: userId, 
        deviceId: deviceId 
      }, 
      { 
        fcmToken: fcmToken,
        userType: userType,   
        updatedAt: Date.now() 
      },
      { 
        upsert: true, 
        new: true, 
        setDefaultsOnInsert: true 
      }
    );

    return res.status(200).json({ message: "Token registered and lifespan refreshed successfully" });

  } catch (error) {
    console.error("Token Save Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};



exports.saveOrUpdateToken = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.role; 

    const { deviceId, fcmToken } = req.body;

    if (!deviceId || !fcmToken || !userId || !userType) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    let Model;
    if (userType === 'driver') {
      Model = Driver;
    } else if (userType === 'vendor') {
      Model = Vendor;
    } else {
      return res.status(403).json({ message: "Invalid user role for FCM storage" });
    }

    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    await Model.updateOne(
      { _id: userId },
      { 
        $pull: { 
          fcmTokens: { 
            $or: [
              { updatedAt: { $lt: sixtyDaysAgo } },
              { deviceId: deviceId }               
            ] 
          } 
        } 
      }
    );


    await Model.updateOne(
      { _id: userId },
      { 
        $push: { 
          fcmTokens: { 
            deviceId: deviceId,
            token: fcmToken,
            updatedAt: Date.now()
          } 
        } 
      }
    );

    return res.status(200).json({ message: "FCM token synced to user schema successfully" });

  } catch (error) {
    console.error("FCM Schema Save Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};