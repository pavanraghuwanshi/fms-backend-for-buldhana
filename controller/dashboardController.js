const Device = require("../model/deviceModel");
const VehicleExpenses = require("../model/vehicleExpensesModel");
const DriverExpense = require("../model/driverExpenseModel"); // Add this line
const Trip = require("../model/tripModel");
const VehicleDocument = require("../model/vehicleDocumentModel");
const Attendance = require("../model/attendanceModel");
const Driver = require("../model/driverModel");
const OdometerSchema = require("../model/serviceOdometerModel");
const User = require("../model/userModel");
const GodownLorryReceipt = require("../model/GodownLorryReceiptModel");

exports.getNumberData = async (req, res) => {
  try {
    const {
      roleType,
      role,
      id,
      AssignedBranch = []
    } = req.user;

    const userRole = roleType || role;

    const allowedRoles = ["superadmin", "school", "branch", "branchGroup"];

    if (!allowedRoles.includes(userRole)) {
      return res.status(401).json({
        message: "Unauthorized Access"
      });
    }

    let driverQuery = {};
    let vehicleQuery = {};
    let tripQuery = {};

    const { schoolId, branchId } = req.query;

    // ---------------- DATE FILTER ----------------
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);


    // ---------------- ROLE BASED FILTER ----------------

    if (req.user.role === "user") {
      if (req.user.roleType === "school") {
        vehicleQuery.schoolId = req.user.id;
        driverQuery.supervisor = req.user.id;
        tripQuery.supervisorId = req.user.id;
      }

      if (req.user.roleType === "branch") {
        vehicleQuery.branchId = req.user.id;
        driverQuery.supervisor = req.user.id;
        tripQuery.supervisorId = req.user.id;
      }

      if (req.user.roleType === "branchGroup") {
        vehicleQuery.branchId =  { $in: req.user.AssignedBranch || [] };
        driverQuery.supervisor = req.user.id  ;
        tripQuery.supervisorId = req.user.id;
      }
    }

    if (req.user.role === "worker") {
      tripQuery.workerId = req.user.id;
    }

    const now = new Date();
    const oneMonthFromNow = new Date(now);
    oneMonthFromNow.setMonth(now.getMonth() + 1);

    const [driverData, vehicleData] = await Promise.all([
      Driver.find(driverQuery)
        .select("-profileImage -licenseImage -aadharImage")
        .lean(),

      Device.find(vehicleQuery)
        .select("_id")
        .lean()
    ]);

    const vehicleIds = vehicleData.map(v => v._id.toString());
    const driverIds = driverData.map(d => d._id.toString());

    // ------------------------------------------------------------------
    // FETCH DATA WITH PAGINATION
    // ------------------------------------------------------------------
    const lorryReceiptQuery = {
      isDeleted: { $ne: true },
      issuedBy: { $nin: ["Rack", "Road"] },
      ...tripQuery
    };

    const [totalGodownLorryReceiptCount, todayGodownLorryReceiptCount] = await Promise.all([
      GodownLorryReceipt.countDocuments(lorryReceiptQuery),
      GodownLorryReceipt.countDocuments({
        ...lorryReceiptQuery,
        createdAt: {
          $gte: startOfToday,
          $lte: endOfToday
        }
      })
    ]);

    const [
      vehicleExpenseData,
      driverExpenseData,
      tripData,
      documentData,
      attendanceData,
      odometerData
    ] = await Promise.all([
      VehicleExpenses.find({
        vehicleId: { $in: vehicleIds },
        date: { $gte: startOfToday, $lte: endOfToday }
      }).select("amount").lean(),

      DriverExpense.find({
        driverId: { $in: driverIds },
        date: { $gte: startOfToday, $lte: endOfToday }
      }).select("amount").lean(),

      Trip.find(tripQuery)
        .select("_id")
        .lean(),

      VehicleDocument.find({
        vehicleId: { $in: vehicleIds },
        $or: [
          { "documents.Insurance.expiryDate": { $gte: now, $lte: oneMonthFromNow } },
          { "documents.rc.expiryDate": { $gte: now, $lte: oneMonthFromNow } },
          { "documents.puc.expiryDate": { $gte: now, $lte: oneMonthFromNow } },
          { "documents.fitnessCertificate.expiryDate": { $gte: now, $lte: oneMonthFromNow } }
        ]
      })
        .select("-documents.Insurance.image -documents.rc.image -documents.puc.image -documents.fitnessCertificate.image -createdAt -updatedAt -__v -_id -vehicleId -vehicleName")
        .lean(),

      Attendance.find({
        driverId: { $in: driverIds },
        createdAt: {
          $gte: startOfToday,
          $lte: endOfToday
        }
      }).lean(),

      OdometerSchema.find({
        vehicleId: { $in: vehicleIds }
      }).lean()
    ]);

    let totalCountOfExpiringDocuments = 0;

    for (const item of documentData) {
      if (item.documents) {
        totalCountOfExpiringDocuments += Object.keys(item.documents).length;
      }
    }

    const availableDrivers = driverData.filter(d => !d.currentVehicle).length;
    const unavailableDrivers = driverData.filter(d => d.currentVehicle).length;
    const totalDrivers = driverData.length;

    const totalVehicles = vehicleData.length;

    const assignedVehicleIds = driverData
      .filter(d => d.currentVehicle)
      .map(d => d.currentVehicle.toString());

    const availableVehicles = vehicleData.filter(
      v => !assignedVehicleIds.includes(v._id.toString())
    ).length;

    const unavailableVehicles = vehicleData.filter(
      v => assignedVehicleIds.includes(v._id.toString())
    ).length;

    const totalVehicleExpenses = vehicleExpenseData.reduce(
      (sum, exp) => sum + (exp.amount || 0),
      0
    );

    const totalDriverExpenses = driverExpenseData.reduce(
      (sum, exp) => sum + (exp.amount || 0),
      0
    );

    const totalExpenses = totalVehicleExpenses + totalDriverExpenses;

    const vehiclesUnderMaintenance = odometerData.filter(o => {
      const diff = Number(o.nextServiceDue || 0) - Number(o.currentOdometer || 0);
      return diff <= 100;
    }).length;

    const driversLiveOnWork = driverData.filter(
      d => d.currentVehicle && d.currentTripId
    ).length;

    const driverLocations = attendanceData.filter(
      a => a.status === "Present"
    );

    return res.status(200).json({
      message: "Data fetched successfully",
      data: {
        availableDrivers,
        unavailableDrivers,
        totalDrivers,
        availableVehicles,
        unavailableVehicles,
        totalVehicles,
        totalGodownLorryReceiptCount,
        todayGodownLorryReceiptCount,

        expenses: {
          vehicleExpenses: totalVehicleExpenses,
          driverExpenses: totalDriverExpenses,
          total: totalExpenses
        },
        vehiclesUnderMaintenance,
        driversLiveOnWork,
        documentAlerts: totalCountOfExpiringDocuments,
        driverLocations: driverLocations.length
      },
      metadata: {
        timestamp: new Date(),
        totalRecords: {
          drivers: driverData.length,
          vehicles: vehicleData.length,
          trips: tripData.length,
          vehicleExpenses: vehicleExpenseData.length,
          driverExpenses: driverExpenseData.length,
          documentsExpiring: totalCountOfExpiringDocuments,
          attendanceEntries: attendanceData.length
        }
      }
    });

  } catch (error) {
    console.error("Error in getNumberData:", error);

    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined
    });
  }
};



exports.getAvailableUnavailableVehicles = async (req, res) => {
  try {
    const { roleType, id, AssignedBranch = [] } = req.user;

    let deviceFilter = {};
    let driverFilter = {};

    // 🔥 ROLE BASED FILTER (same as getDevices)
    if (roleType === "school") {
      deviceFilter.schoolId = id;
       driverFilter.supervisor = id;
    }

    if (roleType === "branch") {
      deviceFilter.branchId = id;
       driverFilter.supervisor = id;
    }

    if (roleType === "branchGroup") {
      deviceFilter.branchId = { $in: AssignedBranch };
       driverFilter.supervisor = id;
    }

    // superadmin → no filter

    const [devices, drivers] = await Promise.all([
      Device.find(deviceFilter, 'name category model users')
        .populate('schoolId', 'schoolName')
        .populate('branchId', 'branchName')
        .lean(),

      Driver.find(driverFilter, 'currentVehicle name')
        .lean()
    ]);

    // 🚀 MAP VEHICLE → DRIVER
    const assignedVehicleMap = new Map(
      drivers
        .filter(d => d.currentVehicle)
        .map(d => [d.currentVehicle.toString(), d.name || 'Unknown'])
    );

    const availableVehicles = [];
    const unavailableVehicles = [];

    for (const device of devices) {
      const driverName = assignedVehicleMap.get(device._id.toString());

      if (driverName) {
        unavailableVehicles.push({ ...device, driverName });
      } else {
        availableVehicles.push(device);
      }
    }

    return res.status(200).json({
      availableVehicles,
      unavailableVehicles
    });

  } catch (error) {
    console.error('Error in getAvailableUnavailableVehicles:', error);
    return res.status(500).json({
      message: 'Internal server error',
      error: error.message,
    });
  }
};