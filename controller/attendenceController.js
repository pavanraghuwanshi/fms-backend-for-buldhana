const { default: mongoose } = require("mongoose");
const Attendance = require("../model/attendanceModel");
const Driver = require("../model/driverModel.js");
const Image_attendance = require("../model/image_attendanceModel.js");
const { compressImage } = require("../utils/helperFunctions");
const { notifySupervisorAttendance } = require("../services/notificationService");

exports.markAttendanceByDriver = async (req, res) => {
  try {
    const driverId = req.user.id;
    const selfie = req.file
    const { lat, long } = req.body

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    today.setTime(today.getTime() + 5.5 * 60 * 60 * 1000);

    // Check if attendance already exists for today
    const existingAttendance = await Attendance.findOne({
      driverId,
      createdAt: {
        $gte: today,
        $lt: new Date(today).setDate(new Date(today).getDate() + 1),
      },
    });

    if (existingAttendance) return res.status(400).json({ message: "Attendance already marked for today" });

    let attendanceImageId;
    if (selfie) {
      const { base64Data, contentType } = await compressImage(selfie);
      const spotImg = await Image_attendance.create({ base64Data, contentType });
      attendanceImageId = spotImg._id;
    }
    else {
      return res.status(400).json({ message: "Please provide a selfie image" });
    }

    const presentAttendance = new Attendance({
      driverId,
      status: "Present",
      lat,
      long,
      ...(attendanceImageId && { attendanceImageId }),
    });
    await presentAttendance.save();

    const driver = await Driver.findById(driverId).select("name supervisor");
    if (driver?.supervisor) {
      notifySupervisorAttendance(driver.supervisor, driver, presentAttendance).catch((error) => {
        console.error("Async attendance notification error:", error);
      });
    }

    return res.status(200).json({ message: `Attendance marked successfully for date ${today} `,  attendanceId: presentAttendance._id, });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" + error.message });
  }
};

exports.markAttendanceBySupervisor = async (req, res) => {
  try {
    const driverId = req.params.driverId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    today.setTime(today.getTime() + 5.5 * 60 * 60 * 1000);

    // Check if attendance already exists for today
    const existingAttendance = await Attendance.findOne({
      driverId,
      createdAt: {
        $gte: today,
        $lt: new Date(today).setDate(new Date(today).getDate() + 1),
      },
    });

    if (existingAttendance) return res.status(400).json({ message: "Attendance already marked for today" });

    const presentAttendance = new Attendance({
      driverId,
      status: "Present",
    });
    await presentAttendance.save();

    return res.status(200).json({ message: `Attendance marked successfully for date ${new Intl.DateTimeFormat("en-GB").format(new Date(today))} ` });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" + error.message });
  }
};

exports.getAttendanceHistoryByDriverId = async (req, res) => {
  try {
    const driverId = req.params.id;
    const attendanceHistory = await Attendance.find({ driverId }).populate("driverId", "-_id name supervisor").select("-__v -updatedAt -_id");
    return res.status(200).json(attendanceHistory.map((item) => {

      const createdAt = item.createdAt.toISOString().split("-");
      const day = String(createdAt[2].split("T")[0]).padStart(2, '0');
      const month = String(createdAt[1]).padStart(2, '0');
      const year = createdAt[0];
      const formattedDate = `${day}/${month}/${year}`;

      return {
        driverName: item.driverId.name,
        status: item.status,
        createdAt: formattedDate,
      };
    }));

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" + error.message });
  }
};

exports.getAttendanceMonthWiseByDriverId = async (req, res) => {
  try {
    const { driverId, month } = req.query; // Extracting month from URL (YYYY-MM)

    const startDate = new Date(`${month}-01T00:00:00.000Z`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(0);
    endDate.setUTCHours(23, 59, 59, 999);

    if (isNaN(startDate.getTime())) return res.status(400).json({ error: "Invalid month format. Use YYYY-MM." });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalDaysInMonth;

    if (startDate.getFullYear() === today.getFullYear() && startDate.getMonth() === today.getMonth()) {
      totalDaysInMonth = today.getDate();
    } else {
      totalDaysInMonth = new Date(endDate.getTime() - 10 * 60 * 60 * 1000).getDate();
    }

    const attendanceHistory = await Attendance.find({
      driverId,
      createdAt: { $gte: startDate, $lt: endDate },
    }).populate("driverId", "-_id name supervisor").select("-__v -updatedAt -_id");

    let presentCount = 0;
    let totalAbsentCount = 0;
    let absentCount = 0;
    let onLeaveCount = 0;

    attendanceHistory.forEach((item) => {
      const status = item.status;
      if (status === "Present") {
        presentCount++;
      } else if (status === "Absent") {
        absentCount++;
        totalAbsentCount++;
      } else if (status === "On Leave") {
        onLeaveCount++;
        totalAbsentCount++;
      }
    });

    const presentPercentage = ((presentCount / totalDaysInMonth) * 100).toFixed(2);
    const totalAbsentPercentage = ((totalAbsentCount / totalDaysInMonth) * 100).toFixed(2);

    let absentPercentage = "0.00";
    let onLeavePercentage = "0.00";

    if (totalAbsentCount > 0) {
      absentPercentage = ((absentCount / totalAbsentCount) * 100).toFixed(2);
      onLeavePercentage = ((onLeaveCount / totalAbsentCount) * 100).toFixed(2);
    }

    return res.status(200).json({
      presentCount,
      absentCount,
      onLeaveCount,
      totalDaysInMonth,
      presentPercentage: `${presentPercentage}%`,
      totalAbsentPercentage: `${totalAbsentPercentage}%`,
      unplannedLeavePercentage: `${absentPercentage}%`,
      plannedLeavePercentage: `${onLeavePercentage}%`,
      attendanceDetails: attendanceHistory.map((item) => {

        return {
          status: item.status,
          createdAt:item.createdAt,
          imageId: item.attendanceImageId,
          lat: item.lat,
          long: item.long,
          endLat:item.endLat,
          endLong:item.endLong,
          checkoutTime:item.checkoutTime,
          driverName: item.driverId.name,
        }
      }),
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" + error.message });
  }
};

exports.getRemainingAttendenceOfDriversForSupervisor = async (req, res) => {
  try {
    // Check for allowed roles (assuming "user" is the correct role, not "supervisor")
    const allowedRoles = ["user", "superadmin"];
    if (!req.user || !allowedRoles.includes(req.user.role)) return res.status(403).json({ message: "Unauthorized access" });

    const supervisorId = req.user.id;
    const drivers = await Driver.find({ supervisor: supervisorId }).select('name contactNumber email');

    // Set start and end date for today in IST (UTC+5:30)
    const startDate = new Date(new Date().setHours(0, 0, 0, 0) + 5.5 * 60 * 60 * 1000);
    const endDate = new Date(new Date().setHours(23, 59, 59, 999) + 5.5 * 60 * 60 * 1000);

    const attendanceHistory = await Attendance.find({
      driverId: { $in: drivers.map(driver => driver._id) },
      createdAt: { $gte: startDate, $lte: endDate },
    }).select('driverId -_id');

    const markedDriverIds = attendanceHistory.map(attendance => attendance.driverId.toString());
    const unmarkedDrivers = drivers.filter(driver => !markedDriverIds.includes(driver._id.toString()));

    return res.status(200).json({ message: "Unmarked drivers fetched successfully", total: unmarkedDrivers.length, data: unmarkedDrivers });
  } catch (error) {
    console.error("Error fetching unmarked drivers:", error);
    return res.status(500).json({ message: "Server error" + error.message });
  }
};

// exports.getAttendanceLocations = async (req, res) => {
//   try {
//     if (req.user.role !== "superadmin" && req.user.role !== "user") return res.status(403).json({ success: false, message: "Unauthorized access" });
//     const startDate = new Date(new Date().setHours(0, 0, 0, 0) + 5.5 * 60 * 60 * 1000);
//     const endDate = new Date(new Date().setHours(23, 59, 59, 999) + 5.5 * 60 * 60 * 1000);

//     let query = {
//       createdAt: { $gte: startDate, $lte: endDate },
//       status: "Present",
//       // lat: { $exists: true, $ne: null },
//       // long: { $exists: true, $ne: null },
//     };

//     if (req.user.role === "user") {
//       const drivers = await Driver.find({ supervisor: req.user.id }).select('_id').lean();
//       if (!drivers.length) return res.status(404).json({ success: false, message: "No drivers found for the supervisor", });
//       const driverIds = drivers.map(driver => driver._id);
//       query.driverId = { $in: driverIds };
//     }

//     const attendanceLocations = await Attendance.find(query).select('-__v ').populate("driverId", "supervisor name").lean();
//     return res.status(200).json({ success: true, attendanceLocations, });
//   } catch (error) {
//     console.error("Error in getAttendanceLocations:", error);
//     return res.status(500).json({ success: false, message: "Server error" + error.message });
//   }
// };

exports.getAttendanceLocations = async (req, res) => {
  try {
    if (req.user.role !== "superadmin" && req.user.role !== "user") {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    // Parse dates from query if provided, else use today's IST range
    let startDate, endDate;
    if (req.query.startDate && req.query.endDate) {
      startDate = new Date(req.query.startDate);
      endDate = new Date(req.query.endDate);

      // Convert to IST by adding 5.5 hours
      startDate = new Date(startDate.getTime() + 5.5 * 60 * 60 * 1000);
      endDate = new Date(endDate.getTime() + 5.5 * 60 * 60 * 1000);
    } else {
      const now = new Date();
      startDate = new Date(new Date().setHours(0, 0, 0, 0) + 5.5 * 60 * 60 * 1000);
      endDate = new Date(new Date().setHours(23, 59, 59, 999) + 5.5 * 60 * 60 * 1000);
    }

    let query = {
      createdAt: { $gte: startDate, $lte: endDate },
      status: "Present",
    };

    if (req.user.role === "user") {
      const drivers = await Driver.find({ supervisor: req.user.id }).select('_id').lean();
      if (!drivers.length) return res.status(404).json({ success: false, message: "No drivers found for the supervisor" });
      const driverIds = drivers.map(driver => driver._id);
      query.driverId = { $in: driverIds };
    }

    const attendanceLocations = await Attendance.find(query)
      .select('-__v')
      .populate("driverId", "supervisor name")
      .lean();

    return res.status(200).json({ success: true, attendanceLocations });
  } catch (error) {
    console.error("Error in getAttendanceLocations:", error);
    return res.status(500).json({ success: false, message: "Server error: " + error.message });
  }
};


exports.getAttendanceImageById = async (req, res) => {
  try {
    const imgId = req.params.id;
    if (!imgId) return res.status(400).json({ message: 'Image ID is required.' });
    const image = await Image_attendance.findById(imgId);
    if (!image) return res.status(404).json({ message: 'Image not found.' });
    return res.status(200).json(image);
  } catch (error) {
    console.error("Error fetching attendance image:", error);
    return res.status(500).json({ message: 'Server error' + error.message });
  };
};

//  checkout lat long or time api by pavan

exports.checkoutAttendanceByDriver = async (req, res) => {
  try {
    const driverId = req.user.id;
    const { id } = req.params; 
    const { endLat, endLong } = req.body;

    const attendance = await Attendance.findOne({ _id: id, driverId });

    if (!attendance) {
      return res.status(404).json({ message: "Attendance record not found" });
    }

    if (attendance.checkoutTime) {
      return res.status(400).json({ message: "Checkout already marked for today" });
    }

    attendance.checkoutTime = new Date();
    attendance.endLat = endLat;
    attendance.endLong = endLong;

    await attendance.save();

    return res.status(200).json({
      message: "Checkout marked successfully",
      data: {
        id: attendance._id,
        driverId: attendance.driverId,
        checkInTime: attendance.createdAt,
        checkoutTime: attendance.checkoutTime,
        checkInLocation: {
          lat: attendance.lat,
          long: attendance.long,
        },
        checkoutLocation: {
          lat: attendance.endLat,
          long: attendance.endLong,
        },
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error: " + error.message });
  }
};



exports.getTodayAttendanceById = async (req, res) => {
  try {
    const { id } = req.user;
    const driverObjectId = new mongoose.Types.ObjectId(id);

    const today = new Date();
    const startTime = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0));
    const endTime = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 59, 59, 999));
    const attendance = await Attendance.findOne({
      driverId: driverObjectId,
      createdAt: { $gte: startTime, $lte: endTime },
    })
      .populate("driverId", "name mobileNumber")
      .select("_id status lat long createdAt checkoutTime endLat endLong attendanceImageId");

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "No attendance found between 00:00 and 11:59 UTC for today.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Attendance fetched successfully for 00:00–11:59 UTC.",
      attendance,
    });
  } catch (error) {
    console.error("Error in getTodayAttendanceById:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};




