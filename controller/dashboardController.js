const Device = require("../model/deviceModel");
const VehicleExpenses = require("../model/vehicleExpensesModel");
const DriverExpense = require("../model/driverExpenseModel"); // Add this line
const Trip = require("../model/tripModel");
const VehicleDocument = require("../model/vehicleDocumentModel");
const Attendance = require("../model/attendanceModel");
const Driver = require("../model/driverModel");
const OdometerSchema = require("../model/serviceOdometerModel");
const User = require("../model/userModel");
const Builty = require("../model/builtyModel");
const DailyBuilty = require("../model/dailyBuilty.model");
const VehicleMaster = require("../model/maintenanceDevice.model");


exports.getNumberData = async (req, res) => {
  try {
    const { roleType, role, id, AssignedBranch = [] } = req.user;

    const userRole = roleType || role;
    const allowedRoles = ["superadmin", "school", "branch", "branchGroup"];

    if (!allowedRoles.includes(userRole)) {
      return res.status(401).json({
        message: "Unauthorized Access",
      });
    }

    let driverQuery = {};
    let vehicleQuery = {};
    let tripQuery = {};
    let builtyQuery = {};
    let dailyBuiltyQuery = {};

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // ---------------- ROLE BASED FILTER ----------------

    if (req.user.role === "user") {
      if (req.user.roleType === "school") {
        vehicleQuery.supervisorId = req.user.id;
        vehicleQuery.supervisorModel = "School";

        driverQuery.supervisor = req.user.id;
        tripQuery.supervisorId = req.user.id;

        builtyQuery.supervisorId = req.user.id;
        builtyQuery.supervisorModel = "School";

        dailyBuiltyQuery.supervisorId = req.user.id;
        dailyBuiltyQuery.supervisorModel = "School";
      }

      if (req.user.roleType === "branch") {
        vehicleQuery.supervisorId = req.user.id;
        vehicleQuery.supervisorModel = "Branch";

        driverQuery.supervisor = req.user.id;
        tripQuery.supervisorId = req.user.id;

        builtyQuery.supervisorId = req.user.id;
        builtyQuery.supervisorModel = "Branch";

        dailyBuiltyQuery.supervisorId = req.user.id;
        dailyBuiltyQuery.supervisorModel = "Branch";
      }

      if (req.user.roleType === "branchGroup") {
        vehicleQuery.supervisorId = req.user.id;
        vehicleQuery.supervisorModel = "BranchGroup";

        driverQuery.supervisor = req.user.id;
        tripQuery.supervisorId = req.user.id;

        builtyQuery.supervisorId = req.user.id;
        builtyQuery.supervisorModel = "BranchGroup";

        dailyBuiltyQuery.supervisorId = req.user.id;
        dailyBuiltyQuery.supervisorModel = "BranchGroup";
      }
    }

    if (req.user.role === "worker") {
      tripQuery.workerId = req.user.id;
      builtyQuery.workerId = req.user.id;
      dailyBuiltyQuery.createdBy = req.user.id;
    }

    if (req.user.role === "driver") {
      tripQuery.driverId = req.user.id;
      builtyQuery.driverId = req.user.id;
      dailyBuiltyQuery.driverId = req.user.id;
    }

    const now = new Date();
    const oneMonthFromNow = new Date(now);
    oneMonthFromNow.setMonth(now.getMonth() + 1);

    const [driverData, vehicleData] = await Promise.all([
      Driver.find(driverQuery)
        .select("-profileImage -licenseImage -aadharImage")
        .lean(),

      VehicleMaster.find(vehicleQuery).select("_id").lean(),
    ]);

    const vehicleIds = vehicleData.map((v) => v._id.toString());
    const driverIds = driverData.map((d) => d._id.toString());

    // ---------------- TRANSPORT PASS FROM BUILTY ----------------

    const transportPassQuery = {
      ...builtyQuery,
      status: { $ne: "Cancelled" },
    };

    const dailyBuiltyBaseQuery = {
      ...dailyBuiltyQuery,
    };

    const [
      totalTransportPassCount,
      todayTransportPassCount,
      completedTransportPassCount,
      cancelledTransportPassCount,

      totalDailyBuiltyCount,
      todayDailyBuiltyCount,
      createdDailyBuiltyCount,
      completedDailyBuiltyCount,
      cancelledDailyBuiltyCount,
    ] = await Promise.all([
      Builty.countDocuments(transportPassQuery),

      Builty.countDocuments({
        ...transportPassQuery,
        createdAt: { $gte: startOfToday, $lte: endOfToday },
      }),

      Builty.countDocuments({
        ...builtyQuery,
        status: "Completed",
      }),

      Builty.countDocuments({
        ...builtyQuery,
        status: "Cancelled",
      }),

      DailyBuilty.countDocuments(dailyBuiltyBaseQuery),

      DailyBuilty.countDocuments({
        ...dailyBuiltyBaseQuery,
        createdAt: { $gte: startOfToday, $lte: endOfToday },
      }),

      DailyBuilty.countDocuments({
        ...dailyBuiltyBaseQuery,
        status: "Created",
      }),

      DailyBuilty.countDocuments({
        ...dailyBuiltyBaseQuery,
        status: "Completed",
      }),

      DailyBuilty.countDocuments({
        ...dailyBuiltyBaseQuery,
        status: "Cancelled",
      }),
    ]);

    const [
      vehicleExpenseData,
      driverExpenseData,
      tripData,
      documentData,
      attendanceData,
      odometerData,
    ] = await Promise.all([
      VehicleExpenses.find({
        vehicleId: { $in: vehicleIds },
        date: { $gte: startOfToday, $lte: endOfToday },
      })
        .select("amount")
        .lean(),

      DriverExpense.find({
        driverId: { $in: driverIds },
        date: { $gte: startOfToday, $lte: endOfToday },
      })
        .select("amount")
        .lean(),

      Trip.find(tripQuery).select("_id").lean(),

      VehicleDocument.find({
        vehicleId: { $in: vehicleIds },
        $or: [
          {
            "documents.Insurance.expiryDate": {
              $gte: now,
              $lte: oneMonthFromNow,
            },
          },
          {
            "documents.rc.expiryDate": {
              $gte: now,
              $lte: oneMonthFromNow,
            },
          },
          {
            "documents.puc.expiryDate": {
              $gte: now,
              $lte: oneMonthFromNow,
            },
          },
          {
            "documents.fitnessCertificate.expiryDate": {
              $gte: now,
              $lte: oneMonthFromNow,
            },
          },
        ],
      })
        .select(
          "-documents.Insurance.image -documents.rc.image -documents.puc.image -documents.fitnessCertificate.image -createdAt -updatedAt -__v -_id -vehicleId -vehicleName"
        )
        .lean(),

      Attendance.find({
        driverId: { $in: driverIds },
        createdAt: {
          $gte: startOfToday,
          $lte: endOfToday,
        },
      }).lean(),

      OdometerSchema.find({
        vehicleId: { $in: vehicleIds },
      }).lean(),
    ]);

    let totalCountOfExpiringDocuments = 0;

    for (const item of documentData) {
      if (item.documents) {
        totalCountOfExpiringDocuments += Object.keys(item.documents).length;
      }
    }

    const availableDrivers = driverData.filter((d) => !d.deviceId).length;
    const unavailableDrivers = driverData.filter((d) => d.deviceId).length;
    const totalDrivers = driverData.length;

    const totalVehicles = vehicleData.length;

    const assignedVehicleIds = driverData
      .filter((d) => d.deviceId)
      .map((d) => d.deviceId.toString());

    const availableVehicles = vehicleData.filter(
      (v) => !assignedVehicleIds.includes(v._id.toString())
    ).length;

    const unavailableVehicles = vehicleData.filter((v) =>
      assignedVehicleIds.includes(v._id.toString())
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

    const vehiclesUnderMaintenance = odometerData.filter((o) => {
      const diff =
        Number(o.nextServiceDue || 0) - Number(o.currentOdometer || 0);
      return diff <= 100;
    }).length;

    const driversLiveOnWork = driverData.filter(
      (d) => d.deviceId && d.currentTripId
    ).length;

    const driverLocations = attendanceData.filter(
      (a) => a.status === "Present"
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

        totalGodownLorryReceiptCount: totalTransportPassCount,
        todayGodownLorryReceiptCount: todayTransportPassCount,

        transportPass: {
          total: totalTransportPassCount,
          today: todayTransportPassCount,
          completed: completedTransportPassCount,
          cancelled: cancelledTransportPassCount,
        },

        dailyBuilty: {
          total: totalDailyBuiltyCount,
          today: todayDailyBuiltyCount,
          created: createdDailyBuiltyCount,
          completed: completedDailyBuiltyCount,
          cancelled: cancelledDailyBuiltyCount,
        },

        expenses: {
          vehicleExpenses: totalVehicleExpenses,
          driverExpenses: totalDriverExpenses,
          total: totalExpenses,
        },
        vehiclesUnderMaintenance,
        driversLiveOnWork,
        documentAlerts: totalCountOfExpiringDocuments,
        driverLocations: driverLocations.length,
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
          attendanceEntries: attendanceData.length,
          transportPass: totalTransportPassCount,
          dailyBuilty: totalDailyBuiltyCount,
        },
      },
    });
  } catch (error) {
    console.error("Error in getNumberData:", error);

    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};



exports.getAvailableUnavailableVehicles = async (req, res) => {
  try {
    const { roleType, id, AssignedBranch = [] } = req.user;

    let vehicleFilter = {};
    let driverFilter = {};

    if (roleType === "school") {
      vehicleFilter.supervisorId = id;
      vehicleFilter.supervisorModel = "School";
      driverFilter.supervisor = id;
    }

    if (roleType === "branch") {
      vehicleFilter.supervisorId = id;
      vehicleFilter.supervisorModel = "Branch";
      driverFilter.supervisor = id;
    }

    if (roleType === "branchGroup") {
      vehicleFilter.supervisorId = id;
      vehicleFilter.supervisorModel = "BranchGroup";
      driverFilter.supervisor = id;
    }

    const [vehicles, drivers] = await Promise.all([
      VehicleMaster.find(vehicleFilter, "vehicleNumber categoryId make isAssigned grossVehicleWeight transporterId supervisorId supervisorModel")
        .populate("categoryId")
        .populate("transporterId")
        .lean(),

      Driver.find(driverFilter, "deviceId name").lean(),
    ]);

    const assignedDeviceMap = new Map(
      drivers
        .filter((d) => d.deviceId)
        .map((d) => [d.deviceId.toString(), d.name || "Unknown"])
    );

    const availableVehicles = [];
    const unavailableVehicles = [];

    for (const vehicle of vehicles) {
      const driverName = assignedDeviceMap.get(vehicle._id.toString());

      if (driverName) {
        unavailableVehicles.push({ ...vehicle, driverName });
      } else {
        availableVehicles.push(vehicle);
      }
    }

    return res.status(200).json({
      availableVehicles,
      unavailableVehicles,
    });
  } catch (error) {
    console.error("Error in getAvailableUnavailableVehicles:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};