const { default: mongoose } = require("mongoose");
const Attendance = require("../model/attendanceModel");
const LeaveRequest = require("../model/leaveModel");
const Driver = require("../model/driverModel");
const { compressImage } = require("../utils/helperFunctions");
const Device = require("../model/deviceModel");
const VehicleMaster = require("../model/maintenanceDevice.model");

exports.createDriver = async (req, res) => {
  try {
    const {
      name,
      contactNumber,
      email,
      password,
      licenseNumber,
      licenseExpiryDate,
      aadharNumber,
      amount,
      deviceId,
    } = req.body;

    if (
      req.user.role !== "superadmin" &&
      req.user.role !== "user"
    ) {
      return res.status(402).json({
        message: "you are not authorized to create driver",
      });
    }

    const existingDriver = await Driver.findOne({ contactNumber });

    if (existingDriver) {
      return res.status(400).json({
        success: false,
        message: `Driver already exists with contact number: ${contactNumber}`,
        driver: existingDriver,
      });
    }

    const profileImage = req.files?.["profileImage"]?.[0];
    const licenseImage = req.files?.["licenseImage"]?.[0];
    const aadharImage = req.files?.["aadharImage"]?.[0];

    const driver = new Driver({
      name,
      contactNumber,
      email,
      password,
      licenseNumber,
      aadharNumber,
      profileImage: profileImage
        ? await compressImage(profileImage)
        : undefined,
      licenseImage: licenseImage
        ? await compressImage(licenseImage)
        : undefined,
      aadharImage: aadharImage
        ? await compressImage(aadharImage)
        : undefined,
      amount,
      supervisor: req.user.id,
      licenseExpiryDate,
      deviceId,
      isAssigned: !!deviceId,
    });

    await driver.save();

    // ✅ VehicleMaster bhi assign mark karo
    if (deviceId) {
      await VehicleMaster.findByIdAndUpdate(
        deviceId,
        {
          $set: {
            isAssigned: true,
          },
        },
        { new: true }
      );
    }

    return res.status(201).json(driver);
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
};

exports.getAllDrivers = async (req, res) => {
  try {
    if (req.user.role === "superadmin") {
      const { supervisorId } = req.query;
      const query = supervisorId ? { supervisor: supervisorId } : {};
      const drivers = await Driver.find(query).select("name contactNumber email password supervisor licenseNumber licenseExpiryDate");
      return res.status(200).json(
        drivers.map((driver) => {
          driver.password = driver.getDecryptedPassword();
          return driver;
        })
      );
    } else if (["user", "worker"].includes(req.user.role)) {
      let supervisor;
      if (req.user.role === "worker") supervisor = req.user.supervisor;
      else supervisor = req.user.id;
      const drivers = await Driver.find({ supervisor }).select("name contactNumber email password supervisor licenseNumber licenseExpiryDate");
      return res.status(200).json(
        drivers.map((driver) => {
          driver.password = driver.getDecryptedPassword();
          return driver;
        })
      );
    } else {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.getDriverProfile = async (req, res) => {
  try {
    if (req.user.role === "driver") {
      const driver = await Driver.findById(req.user.id).select("name email contactNumber profileImage currentVehicleName currentVehicle ").lean()

      if (!driver) return res.status(404).json({ message: "Driver not found" });

      if (driver.currentVehicleName) {
        const device = await Device.findOne({ name: driver.currentVehicleName }).select("category")
        driver.category = device?.category
      }

      // Convert base64 image to a proper URL or inline base64 data
      if (driver?.profileImage?.base64Data) {
        driver.profileImage = {
          base64Data: `data:${driver.profileImage.contentType};base64,${driver.profileImage.base64Data}`,
          contentType: driver.profileImage.contentType,
        };
      }

      return res.status(200).json(driver);
    } else {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.getDriverById = async (req, res) => {
  try {
    const now = new Date();
    const firstDayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const lastDayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));

    const istOffset = 5.5 * 60 * 60 * 1000;
    const firstDayIST = new Date(firstDayUTC.getTime() + istOffset);
    const lastDayIST = new Date(lastDayUTC.getTime() + istOffset);

    const [driver, attendance, leaves] = await Promise.all([
      Driver.findById(req.params.id).select("name email contactNumber aadharNumber licenseNumber profileImage currentVehicleName createdAt"),
      Attendance.aggregate([
        {
          $match: {
            driverId: new mongoose.Types.ObjectId(req.params.id),
            createdAt: { $gte: firstDayIST, $lte: lastDayIST },
            status: { $in: ["Present", "Absent"] },
          },
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
      LeaveRequest.aggregate([
        {
          $match: {
            driverId: new mongoose.Types.ObjectId(req.params.id),
            createdAt: { $gte: firstDayIST, $lte: lastDayIST },
            status: { $in: ["Approved", "Pending"] },
          },
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    if (!driver) return res.status(404).json({ message: "Driver not found" });

    // Convert base64 image to a proper URL or inline base64 data
    if (driver.profileImage.base64Data) {
      driver.profileImage = {
        base64Data: `data:${driver.profileImage.contentType};base64,${driver.profileImage.base64Data}`,
        contentType: driver.profileImage.contentType,
      };
    }
    // Format the result
    const summary = { Present: 0, Absent: 0, Pending: 0, Approved: 0 };
    attendance.forEach((item) => {
      summary[item._id] = item.count;
    });
    leaves.forEach((item) => {
      summary[item._id] = item.count;
    });

    return res.status(200).json({ driver, attendance: summary });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};


exports.updateDriver = async (req, res) => {
  try {
    const {
      name,
      contactNumber,
      email,
      licenseNumber,
      licenseExpiryDate,
      aadharNumber,
      password,
      deviceId,
    } = req.body;

    const profileImage = req.files?.["profileImage"]?.[0];
    const licenseImage = req.files?.["licenseImage"]?.[0];
    const aadharImage = req.files?.["aadharImage"]?.[0];

    const driver = await Driver.findById(req.params.id);

    if (!driver) {
      return res.status(404).json({
        message: "Driver not found",
      });
    }

    const oldDeviceId = driver.deviceId?.toString();

    if (name) driver.name = name;
    if (contactNumber) driver.contactNumber = contactNumber;
    if (email) driver.email = email;
    if (licenseNumber) driver.licenseNumber = licenseNumber;
    if (aadharNumber) driver.aadharNumber = aadharNumber;
    if (password) driver.password = password;
    if (licenseExpiryDate) driver.licenseExpiryDate = licenseExpiryDate;

    if (deviceId !== undefined) {
      if (oldDeviceId && (!deviceId || oldDeviceId !== deviceId.toString())) {
        await VehicleMaster.findByIdAndUpdate(oldDeviceId, {
          $set: { isAssigned: false },
        });
      }

      if (deviceId) {
        await VehicleMaster.findByIdAndUpdate(deviceId, {
          $set: { isAssigned: true },
        });

        driver.deviceId = deviceId;
        driver.isAssigned = true;
      } else {
        driver.deviceId = null;
        driver.isAssigned = false;
      }
    }

    if (profileImage) {
      driver.profileImage = await compressImage(profileImage);
    }

    if (licenseImage) {
      driver.licenseImage = await compressImage(licenseImage);
    }

    if (aadharImage) {
      driver.aadharImage = await compressImage(aadharImage);
    }

    await driver.save();

    return res.status(200).json(driver);
  } catch (error) {
    console.error("Update driver error:", error.message);

    return res.status(500).json({
      error: error.message,
    });
  }
};

exports.deleteDriver = async (req, res) => {
  try {
    if (req.user.role === "user") {
      const driver = await Driver.findByIdAndDelete(req.params.id);
      if (!driver) return res.status(404).json({ message: "Driver not found" });
      return res.status(200).json({ message: "Driver deleted successfully" });
    } else {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.getDriverDocument = async (req, res) => {
  try {
    const { driverId, field } = req.query
    const driverDocument = await Driver.findById(driverId).select(`${field}`);
    if (!driverDocument) return res.status(404).json({ message: "Driver document not found" });

    if (field === 'profileImage') {
      if (!driverDocument.profileImage.base64Data) return res.status(404).json({ message: "No image found" });
      driverDocument.profileImage = {
        base64Data: `data:${driverDocument.profileImage.contentType};base64,${driverDocument.profileImage.base64Data}`,
        contentType: driverDocument.profileImage.contentType,
      };
    } else if (field === 'licenseImage') {
      if (!driverDocument.licenseImage.base64Data) return res.status(404).json({ message: "No image found" });
      driverDocument.licenseImage = {
        base64Data: `data:${driverDocument.licenseImage.contentType};base64,${driverDocument.licenseImage.base64Data}`,
        contentType: driverDocument.licenseImage.contentType,
      };
    } else if (field === 'aadharImage') {
      if (!driverDocument.aadharImage.base64Data) return res.status(404).json({ message: "No image found" });
      driverDocument.aadharImage = {
        base64Data: `data:${driverDocument.aadharImage.contentType};base64,${driverDocument.aadharImage.base64Data}`,
        contentType: driverDocument.aadharImage.contentType,
      };
    } else {
      return res.status(400).json({ message: "Invalid field" });
    }

    return res.status(200).json({ message: "Vehicle document retrieved successfully", driverDocument });
  } catch (error) {
    return res.status(500).json({ message: "Error fetching vehicle document", error: error.message });
  }
};

exports.getDriverStatus = async (req, res) => {
  try {
    if (req.user.role !== "superadmin" && req.user.role !== "user") return res.status(403).json({ success: false, message: "Unauthorized access", });
    let query = {};

    // If superadmin and userId is provided in query, filter by userId
    if (req.user.role === "superadmin" && req.query.userId) query.supervisor = req.query.userId;
    else if (req.user.role === "user") query.supervisor = req.user.id

    // Drivers with no assignedVehicle (null or undefined)
    const availableDrivers = await Driver.find({
      ...query,
      $or: [
        { currentVehicle: { $exists: false } },
        { currentVehicle: null },
      ],
    }).select('name contactNumber email supervisor').lean();

    // Drivers with assignedVehicle as valid ObjectId
    const unavailableDrivers = await Driver.find({
      ...query,
      currentVehicle: { $type: "objectId" },
    }).select('name contactNumber email supervisor').lean();

    return res.status(200).json({ success: true, availableDrivers, unavailableDrivers });
  } catch (error) {
    console.error("Error in getDriverStatus:", error);
    return res.status(500).json({ success: false, message: "Server error" + error.message });
  }
};

exports.leaveDashboard = async (req, res) => {
  try {
    if (req.user.role !== "driver") return res.status(403).json({ success: false, message: "Unauthorized access" });

    const now = new Date();
    const driverObjectId = new mongoose.Types.ObjectId(req.user.id);

    // Current month range in UTC
    const firstDayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const lastDayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));
    const firstDayIST = new Date(firstDayUTC.getTime());
    const lastDayIST = new Date(lastDayUTC.getTime());

    const monthNames = [
      "january", "february", "march", "april", "may", "june",
      "july", "august", "september", "october", "november", "december"
    ];

    // Prepare the last 5 months including current
    const leaveMonthRanges = [];
    for (let i = 4; i >= 0; i--) {
      const tempDate = new Date(now);
      tempDate.setUTCMonth(now.getUTCMonth() - i);

      const year = tempDate.getUTCFullYear();
      const month = tempDate.getUTCMonth();

      const monthStart = new Date(Date.UTC(year, month, 1));
      const monthEnd = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));

      leaveMonthRanges.push({
        month: monthNames[month],
        start: monthStart,
        end: monthEnd,
      });
    }

    const [absentData, leaveRequestData, ...onLeaveCounts] = await Promise.all([
      Attendance.aggregate([
        {
          $match: {
            driverId: driverObjectId,
            createdAt: { $gte: firstDayIST, $lte: lastDayIST },
            status: "Absent",
          },
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
      LeaveRequest.aggregate([
        {
          $match: {
            driverId: driverObjectId,
            createdAt: { $gte: firstDayIST, $lte: lastDayIST },
            status: { $in: ["Approved", "Pending"] },
          },
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
      ...leaveMonthRanges.map(({ start, end }) =>
        Attendance.countDocuments({
          driverId: driverObjectId,
          createdAt: { $gte: start, $lte: end },
          status: "On Leave",
        })
      ),
    ]);

    // Format attendance summary
    const summary = { Absent: 0, Pending: 0, Approved: 0 };
    absentData.forEach(item => { summary[item._id] = item.count; });
    leaveRequestData.forEach(item => { summary[item._id] = item.count; });

    // Format leaves summary
    const leaveCountsByMonth = {};
    leaveMonthRanges.forEach((item, index) => {
      leaveCountsByMonth[item.month] = onLeaveCounts[index];
    });

    return res.status(200).json({
      attendance: summary,
      leaves: leaveCountsByMonth,
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};



exports.getDriverDropdown = async (req, res) => {
  try {
    const role = req.user.role;

    if (!["superadmin", "user", "worker"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const {
      supervisorId,
      search = "",
      page = 1,
      limit = 20,
    } = req.query;

    const currentPage = Math.max(Number(page) || 1, 1);
    const perPage = Math.max(Number(limit) || 20, 1);
    const skip = (currentPage - 1) * perPage;

    const query = {
      isAssigned: false,
    };

    if (role === "superadmin") {
      if (supervisorId) {
        query.supervisor = supervisorId;
      }
    } else if (role === "worker") {
      query.supervisor = req.user.supervisor;
    } else {
      query.supervisor = req.user.id;
    }

    if (search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { contactNumber: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const [drivers, total] = await Promise.all([
      Driver.find(query)
        .select("_id name")
        .sort({ name: 1 })
        .skip(skip)
        .limit(perPage)
        .lean(),

      Driver.countDocuments(query),
    ]);

    return res.status(200).json({
      message: "Driver dropdown fetched successfully",
      pagination: {
        total,
        page: currentPage,
        limit: perPage,
        totalPages: Math.ceil(total / perPage),
      },
      drivers: drivers.map((driver) => ({
        _id: driver._id,
        name: driver.name,
      })),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching driver dropdown",
      error: error.message,
    });
  }
};