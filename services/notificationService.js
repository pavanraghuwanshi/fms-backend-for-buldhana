const admin = require('../config/firebaseConfig');
const Vendor = require('../model/vendor');
const Driver = require('../model/driverModel');
const School = require('../model/school');
const Branch = require('../model/branch');
const BranchGroup = require('../model/branchGroup');
const NotificationPermissions = require('../model/notificationPermissionsSchema');

const UNREGISTERED_TOKEN_ERRORS = [
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered'
];

const filterUnregisteredTokens = (response, tokens) => {
  if (!response || !response.responses) return [];
  return response.responses
    .map((resp, index) => {
      if (!resp.success) {
        console.error(`[Notification] FCM send error for token ${tokens[index]}:`, resp.error?.code, resp.error?.message);
        if (resp.error?.code && UNREGISTERED_TOKEN_ERRORS.includes(resp.error.code)) {
          return tokens[index];
        }
      }
      return null;
    })
    .filter(Boolean);
};

const checkSupervisorNotificationPermission = async (supervisorId, supervisorModel, permissionField) => {
  try {
    if (!supervisorId) {
      console.log(`[Notification Permission] NOT SENT: supervisorId is missing.`);
      return false;
    }

    let normModel = supervisorModel;
    if (normModel) {
      const lower = String(normModel).toLowerCase();
      if (lower === "school") normModel = "School";
      else if (lower === "branch") normModel = "Branch";
      else if (lower === "branchgroup") normModel = "BranchGroup";
    }

    let permissions = null;
    if (normModel) {
      permissions = await NotificationPermissions.findOne({ supervisorId, supervisorModel: normModel });
    }
    if (!permissions) {
      permissions = await NotificationPermissions.findOne({ supervisorId });
    }

    if (!permissions) {
      console.log(`[Notification Permission] NOT SENT: No NotificationPermissions record found in DB for supervisor ${supervisorId} (${supervisorModel || 'unknown'}).`);
      return false;
    }

    const isAllowed = Boolean(permissions[permissionField]);
    if (!isAllowed) {
      console.log(`[Notification Permission] NOT SENT: Supervisor ${supervisorId} (${supervisorModel || 'unknown'}) has '${permissionField}' set to FALSE in database.`);
    } else {
      console.log(`[Notification Permission] ALLOWED: Supervisor ${supervisorId} (${supervisorModel || 'unknown'}) has '${permissionField}' set to TRUE in database.`);
    }

    return isAllowed;
  } catch (error) {
    console.error(`[Notification Permission] Error checking ${permissionField} for supervisor ${supervisorId}:`, error);
    return false;
  }
};

const notifyVendor = async (vendorId, builtyData) => {
  try {
    if (builtyData?.supervisorId) {
      const canNotify = await checkSupervisorNotificationPermission(
        builtyData.supervisorId,
        builtyData.supervisorModel,
        "vendor_builty_create_notification"
      );
      if (!canNotify) {
        console.warn(`[Notification] NOT SENT to Vendor ${vendorId}. Reason: Supervisor permission 'vendor_builty_create_notification' is disabled or missing.`);
        return;
      }
    }

    const vendor = await Vendor.findById(vendorId).select('+fcmTokens');

    if (!vendor) {
      console.warn(`[Notification] NOT SENT to Vendor ${vendorId}. Reason: Vendor record not found.`);
      return;
    }

    if (!vendor?.fcmTokens || vendor.fcmTokens.length === 0) {
      console.warn(`[Notification] NOT SENT to Vendor ${vendorId}. Reason: No registered FCM tokens found.`);
      return;
    }

    const message = {
      notification: {
        title: "New task for vendor",
        body: `Builty ${builtyData?.tpNo || ''} is ready for you.`
      },
      data: {
        type: "NEW_BUILTY",
        builtyId: builtyData?._id ? builtyData._id.toString() : "",
        tpNo: builtyData?.tpNo != null ? String(builtyData.tpNo) : ""
      }
    };

    const tokens = vendor.fcmTokens.map(item => item.token).filter(Boolean);
    if (!tokens.length) return;

    const response = await admin.messaging().sendEachForMulticast({
      tokens: tokens,
      ...message
    });
    
    console.log(`[Notification] SENT to Vendor ${vendorId}. Dispatch complete. Success: ${response.successCount}, Failure: ${response.failureCount}`);

    const failedTokens = filterUnregisteredTokens(response, tokens);
    if (failedTokens.length > 0) {
      await Vendor.findByIdAndUpdate(vendorId, {
        $pull: { fcmTokens: { token: { $in: failedTokens } } }
      });
    }
  } catch (error) {
    console.error(`[Notification] NOT SENT to Vendor ${vendorId}. Critical error:`, error);
  }
};

const notifyDriverBuiltyAssignment = async (driverId, builtyData) => {
  try {
    if (builtyData?.supervisorId) {
      const canNotify = await checkSupervisorNotificationPermission(
        builtyData.supervisorId,
        builtyData.supervisorModel,
        "driver_trip_builty_notification"
      );
      if (!canNotify) {
        console.warn(`[Notification] NOT SENT to Driver ${driverId}. Reason: Supervisor permission 'driver_trip_builty_notification' is disabled or missing.`);
        return;
      }
    }

    const driver = await Driver.findById(driverId).select('+fcmTokens');

    if (!driver) {
      console.warn(`[Notification] NOT SENT to Driver ${driverId}. Reason: Driver record not found.`);
      return;
    }

    if (!driver?.fcmTokens?.length) {
      console.warn(`[Notification] NOT SENT to Driver ${driverId}. Reason: No registered FCM tokens found.`);
      return;
    }

    const tokens = driver.fcmTokens.map((item) => item.token).filter(Boolean);
    if (!tokens.length) return;

    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title: 'New Builty Assigned driver',
        body: `Builty ${builtyData?.tpNo || ''} has been assigned to you.`
      },
      data: {
        type: 'NEW_BUILTY_ASSIGNED',
        builtyId: builtyData?._id ? builtyData._id.toString() : "",
        tpNo: builtyData?.tpNo != null ? String(builtyData.tpNo) : ""
      }
    });

    console.log(`[Notification] SENT to Driver ${driverId}. Dispatch complete. Success: ${response.successCount}, Failure: ${response.failureCount}`);

    const failedTokens = filterUnregisteredTokens(response, tokens);
    if (failedTokens.length) {
      await Driver.findByIdAndUpdate(driverId, {
        $pull: { fcmTokens: { token: { $in: failedTokens } } }
      });
    }
  } catch (error) {
    console.error(`[Notification] NOT SENT to Driver ${driverId}. Critical error:`, error);
  }
};

const supervisorModels = [School, Branch, BranchGroup];

const modelMap = {
  School,
  Branch,
  BranchGroup
};

const notifySupervisorAttendance = async (supervisorId, driver, attendance) => {
  try {
    if (supervisorId) {
      const canNotify = await checkSupervisorNotificationPermission(
        supervisorId,
        driver?.supervisorModel,
        "driver_attendance_notification"
      );
      if (!canNotify) {
        console.warn(`[Notification] NOT SENT to Supervisor ${supervisorId}. Reason: Supervisor permission 'driver_attendance_notification' is disabled or missing.`);
        return;
      }
    }

    let supervisorDoc = null;
    if (driver?.supervisorModel && modelMap[driver.supervisorModel]) {
      supervisorDoc = await modelMap[driver.supervisorModel].findById(supervisorId).select('fcmToken Notification');
    }
    if (!supervisorDoc) {
      supervisorDoc = (await Promise.all(
        supervisorModels.map((Model) => Model.findById(supervisorId).select('fcmToken Notification'))
      )).find(Boolean);
    }

    if (!supervisorDoc) {
      console.warn(`[Notification] Supervisor not found: ${supervisorId}. Skipping attendance notification.`);
      return;
    }

    const tokens = (supervisorDoc.fcmToken || [])
      .map(t => (typeof t === 'object' && t !== null ? t.token : t))
      .filter(Boolean);
    if (!tokens.length) {
      console.warn(`[Notification] No registered FCM tokens found for supervisor: ${supervisorId}. Skipping.`);
      return;
    }

    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title: 'Driver Attendance Marked',
        body: `${driver?.name || 'Driver'} has marked attendance.`
      },
      data: {
        type: 'ATTENDANCE_MARKED',
        attendanceId: attendance?._id ? attendance._id.toString() : "",
        driverId: driver?._id ? driver._id.toString() : "",
        driverName: String(driver?.name || ""),
        status: String(attendance?.status || "")
      }
    });

    console.log(`[Notification] Attendance dispatch complete. Success: ${response.successCount}, Failure: ${response.failureCount}`);

    const failedTokens = filterUnregisteredTokens(response, tokens);
    if (failedTokens.length) {
      const supervisorModelClass = supervisorDoc.constructor;
      await supervisorModelClass.findByIdAndUpdate(supervisorId, {
        $pull: { fcmToken: { $in: failedTokens } }
      });
    }
  } catch (error) {
    console.error(`[Notification] Critical attendance notification error for supervisor ${supervisorId}:`, error);
  }
};

const notifySupervisorBuiltyCreatedByWorker = async (supervisorId, supervisorModel, builtyData, workerName) => {
  try {
    if (supervisorId) {
      const canNotify = await checkSupervisorNotificationPermission(
        supervisorId,
        supervisorModel,
        "worker_builty_create_notification"
      );
      if (!canNotify) {
        console.warn(`[Notification] NOT SENT to Supervisor ${supervisorId}. Reason: Supervisor permission 'worker_builty_create_notification' is disabled or missing.`);
        return;
      }
    }
    let supervisorDoc = null;
    if (supervisorModel && modelMap[supervisorModel]) {
      supervisorDoc = await modelMap[supervisorModel].findById(supervisorId).select('fcmToken Notification');
    }
    if (!supervisorDoc) {
      supervisorDoc = (await Promise.all(
        supervisorModels.map((Model) => Model.findById(supervisorId).select('fcmToken Notification'))
      )).find(Boolean);
    }

    if (!supervisorDoc) {
      console.warn(`[Notification] Supervisor not found: ${supervisorId}. Skipping worker builty notification.`);
      return;
    }

    const tokens = (supervisorDoc.fcmToken || [])
      .map(t => (typeof t === 'object' && t !== null ? t.token : t))
      .filter(Boolean);

    if (!tokens.length) {
      console.warn(`[Notification] No registered FCM tokens found for supervisor: ${supervisorId}. Skipping worker builty notification.`);
      return;
    }

    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title: 'New Builty Created by Worker',
        body: `Builty ${builtyData?.tpNo || ''} was created by ${workerName || 'Worker'}.`
      },
      data: {
        type: 'WORKER_BUILTY_CREATED',
        builtyId: builtyData?._id ? builtyData._id.toString() : "",
        tpNo: builtyData?.tpNo != null ? String(builtyData.tpNo) : ""
      }
    });

    console.log(`[Notification] Worker builty notification SENT to Supervisor ${supervisorId}. Dispatch complete. Success: ${response.successCount}, Failure: ${response.failureCount}`);

    const failedTokens = filterUnregisteredTokens(response, tokens);
    if (failedTokens.length) {
      const supervisorModelClass = supervisorDoc.constructor;
      await supervisorModelClass.findByIdAndUpdate(supervisorId, {
        $pull: { fcmToken: { $in: failedTokens } }
      });
    }
  } catch (error) {
    console.error(`[Notification] Critical worker builty notification error for supervisor ${supervisorId}:`, error);
  }
};

const notifySupervisorBuiltyDispatched = async (supervisorId, supervisorModel, builtyData, dispatchedByRole, dispatchedByName) => {
  try {
    if (supervisorId) {
      const canNotify = await checkSupervisorNotificationPermission(
        supervisorId,
        supervisorModel,
        "builty_dispatch"
      );
      if (!canNotify) {
        console.warn(`[Notification] NOT SENT to Supervisor ${supervisorId}. Reason: Supervisor permission 'builty_dispatch' is disabled or missing.`);
        return;
      }
    }

    let supervisorDoc = null;
    if (supervisorModel && modelMap[supervisorModel]) {
      supervisorDoc = await modelMap[supervisorModel].findById(supervisorId).select('fcmToken Notification');
    }
    if (!supervisorDoc) {
      supervisorDoc = (await Promise.all(
        supervisorModels.map((Model) => Model.findById(supervisorId).select('fcmToken Notification'))
      )).find(Boolean);
    }

    if (!supervisorDoc) {
      console.warn(`[Notification] Supervisor not found: ${supervisorId}. Skipping dispatch notification.`);
      return;
    }

    const tokens = (supervisorDoc.fcmToken || [])
      .map(t => (typeof t === 'object' && t !== null ? t.token : t))
      .filter(Boolean);

    if (!tokens.length) {
      console.warn(`[Notification] No registered FCM tokens found for supervisor: ${supervisorId}. Skipping dispatch notification.`);
      return;
    }

    const roleTitle = dispatchedByRole ? dispatchedByRole.charAt(0).toUpperCase() + dispatchedByRole.slice(1) : "User";
    const message = {
      notification: {
        title: `Builty Dispatched by ${roleTitle}`,
        body: `Builty ${builtyData?.tpNo || ''} has been dispatched by ${dispatchedByName || roleTitle}.`
      },
      data: {
        type: "BUILTY_DISPATCHED",
        builtyId: builtyData?._id ? builtyData._id.toString() : "",
        tpNo: builtyData?.tpNo != null ? String(builtyData.tpNo) : ""
      }
    };

    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      ...message
    });

    console.log(`[Notification] Dispatch notification SENT to Supervisor ${supervisorId}. Success: ${response.successCount}, Failure: ${response.failureCount}`);

    const failedTokens = filterUnregisteredTokens(response, tokens);
    if (failedTokens.length) {
      const supervisorModelClass = supervisorDoc.constructor;
      await supervisorModelClass.findByIdAndUpdate(supervisorId, {
        $pull: { fcmToken: { $in: failedTokens } }
      });
    }
  } catch (error) {
    console.error(`[Notification] Critical dispatch notification error for supervisor ${supervisorId}:`, error);
  }
};

const notifySupervisorBuiltyCompleted = async (supervisorId, supervisorModel, builtyData, completedByRole, completedByName) => {
  try {
    if (supervisorId) {
      const canNotify = await checkSupervisorNotificationPermission(
        supervisorId,
        supervisorModel,
        "builty_complete"
      );
      if (!canNotify) {
        console.warn(`[Notification] NOT SENT to Supervisor ${supervisorId}. Reason: Supervisor permission 'builty_complete' is disabled or missing.`);
        return;
      }
    }

    let supervisorDoc = null;
    if (supervisorModel && modelMap[supervisorModel]) {
      supervisorDoc = await modelMap[supervisorModel].findById(supervisorId).select('fcmToken Notification');
    }
    if (!supervisorDoc) {
      supervisorDoc = (await Promise.all(
        supervisorModels.map((Model) => Model.findById(supervisorId).select('fcmToken Notification'))
      )).find(Boolean);
    }

    if (!supervisorDoc) {
      console.warn(`[Notification] Supervisor not found: ${supervisorId}. Skipping completed notification.`);
      return;
    }

    const tokens = (supervisorDoc.fcmToken || [])
      .map(t => (typeof t === 'object' && t !== null ? t.token : t))
      .filter(Boolean);

    if (!tokens.length) {
      console.warn(`[Notification] No registered FCM tokens found for supervisor: ${supervisorId}. Skipping completed notification.`);
      return;
    }

    const roleTitle = completedByRole ? completedByRole.charAt(0).toUpperCase() + completedByRole.slice(1) : "User";
    const message = {
      notification: {
        title: `Builty Completed by ${roleTitle}`,
        body: `Builty ${builtyData?.tpNo || ''} has been completed by ${completedByName || roleTitle}.`
      },
      data: {
        type: "BUILTY_COMPLETED",
        builtyId: builtyData?._id ? builtyData._id.toString() : "",
        tpNo: builtyData?.tpNo != null ? String(builtyData.tpNo) : ""
      }
    };

    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      ...message
    });

    console.log(`[Notification] Completed notification SENT to Supervisor ${supervisorId}. Success: ${response.successCount}, Failure: ${response.failureCount}`);

    const failedTokens = filterUnregisteredTokens(response, tokens);
    if (failedTokens.length) {
      const supervisorModelClass = supervisorDoc.constructor;
      await supervisorModelClass.findByIdAndUpdate(supervisorId, {
        $pull: { fcmToken: { $in: failedTokens } }
      });
    }
  } catch (error) {
    console.error(`[Notification] Critical complete notification error for supervisor ${supervisorId}:`, error);
  }
};

const notifySupervisorBuiltyCancelled = async (supervisorId, supervisorModel, builtyData, cancelledByRole, cancelledByName) => {
  try {
    if (supervisorId) {
      const canNotify = await checkSupervisorNotificationPermission(
        supervisorId,
        supervisorModel,
        "builty_cancel_notification"
      );
      if (!canNotify) {
        console.warn(`[Notification] NOT SENT to Supervisor ${supervisorId}. Reason: Supervisor permission 'builty_cancel_notification' is disabled or missing.`);
        return;
      }
    }

    let supervisorDoc = null;
    if (supervisorModel && modelMap[supervisorModel]) {
      supervisorDoc = await modelMap[supervisorModel].findById(supervisorId).select('fcmToken Notification');
    }
    if (!supervisorDoc) {
      supervisorDoc = (await Promise.all(
        supervisorModels.map((Model) => Model.findById(supervisorId).select('fcmToken Notification'))
      )).find(Boolean);
    }

    if (!supervisorDoc) {
      console.warn(`[Notification] Supervisor not found: ${supervisorId}. Skipping cancelled notification.`);
      return;
    }

    const tokens = (supervisorDoc.fcmToken || [])
      .map(t => (typeof t === 'object' && t !== null ? t.token : t))
      .filter(Boolean);

    if (!tokens.length) {
      console.warn(`[Notification] No registered FCM tokens found for supervisor: ${supervisorId}. Skipping cancelled notification.`);
      return;
    }

    const roleTitle = cancelledByRole ? cancelledByRole.charAt(0).toUpperCase() + cancelledByRole.slice(1) : "User";
    const message = {
      notification: {
        title: `Builty Cancelled by ${roleTitle}`,
        body: `Builty ${builtyData?.tpNo || ''} has been cancelled by ${cancelledByName || roleTitle}.`
      },
      data: {
        type: "BUILTY_CANCELLED",
        builtyId: builtyData?._id ? builtyData._id.toString() : "",
        tpNo: builtyData?.tpNo != null ? String(builtyData.tpNo) : "",
        cancelReason: builtyData?.cancelReason != null ? String(builtyData.cancelReason) : ""
      }
    };

    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      ...message
    });

    console.log(`[Notification] Cancelled notification SENT to Supervisor ${supervisorId}. Success: ${response.successCount}, Failure: ${response.failureCount}`);

    const failedTokens = filterUnregisteredTokens(response, tokens);
    if (failedTokens.length) {
      const supervisorModelClass = supervisorDoc.constructor;
      await supervisorModelClass.findByIdAndUpdate(supervisorId, {
        $pull: { fcmToken: { $in: failedTokens } }
      });
    }
  } catch (error) {
    console.error(`[Notification] Critical cancel notification error for supervisor ${supervisorId}:`, error);
  }
};

const notifySupervisorDailyTripStart = async (supervisorId, supervisorModel, driver, tripData, vehicleNumber) => {
  try {
    if (supervisorId) {
      const canNotify = await checkSupervisorNotificationPermission(
        supervisorId,
        supervisorModel || driver?.supervisorModel,
        "driver_daily_trip_notification"
      );
      if (!canNotify) {
        console.warn(`[Notification] NOT SENT to Supervisor ${supervisorId}. Reason: Supervisor permission 'driver_daily_trip_notification' is disabled or missing.`);
        return;
      }
    }

    const sModel = supervisorModel || driver?.supervisorModel;
    let supervisorDoc = null;
    if (sModel && modelMap[sModel]) {
      supervisorDoc = await modelMap[sModel].findById(supervisorId).select('fcmToken Notification');
    }
    if (!supervisorDoc) {
      supervisorDoc = (await Promise.all(
        supervisorModels.map((Model) => Model.findById(supervisorId).select('fcmToken Notification'))
      )).find(Boolean);
    }

    if (!supervisorDoc) {
      console.warn(`[Notification] Supervisor not found: ${supervisorId}. Skipping daily trip start notification.`);
      return;
    }

    const tokens = (supervisorDoc.fcmToken || [])
      .map(t => (typeof t === 'object' && t !== null ? t.token : t))
      .filter(Boolean);

    if (!tokens.length) {
      console.warn(`[Notification] No registered FCM tokens found for supervisor: ${supervisorId}. Skipping daily trip start notification.`);
      return;
    }

    const vehStr = vehicleNumber ? ` for vehicle ${vehicleNumber}` : "";
    const driverName = driver?.name || "Driver";

    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title: 'Daily Trip Started',
        body: `${driverName} has started daily trip${vehStr}.`
      },
      data: {
        type: 'DAILY_TRIP_STARTED',
        tripId: tripData?._id ? tripData._id.toString() : "",
        driverId: driver?._id ? driver._id.toString() : "",
        driverName: String(driverName),
        vehicleNumber: String(vehicleNumber || ""),
        odometerStart: tripData?.odometerStart != null ? String(tripData.odometerStart) : ""
      }
    });

    console.log(`[Notification] Daily trip start notification SENT to Supervisor ${supervisorId}. Success: ${response.successCount}, Failure: ${response.failureCount}`);

    const failedTokens = filterUnregisteredTokens(response, tokens);
    if (failedTokens.length) {
      const supervisorModelClass = supervisorDoc.constructor;
      await supervisorModelClass.findByIdAndUpdate(supervisorId, {
        $pull: { fcmToken: { $in: failedTokens } }
      });
    }
  } catch (error) {
    console.error(`[Notification] Critical daily trip start notification error for supervisor ${supervisorId}:`, error);
  }
};

const notifySupervisorDailyTripEnd = async (supervisorId, supervisorModel, driver, tripData, vehicleNumber) => {
  try {
    if (supervisorId) {
      const canNotify = await checkSupervisorNotificationPermission(
        supervisorId,
        supervisorModel || driver?.supervisorModel,
        "driver_daily_trip_notification"
      );
      if (!canNotify) {
        console.warn(`[Notification] NOT SENT to Supervisor ${supervisorId}. Reason: Supervisor permission 'driver_daily_trip_notification' is disabled or missing.`);
        return;
      }
    }

    const sModel = supervisorModel || driver?.supervisorModel;
    let supervisorDoc = null;
    if (sModel && modelMap[sModel]) {
      supervisorDoc = await modelMap[sModel].findById(supervisorId).select('fcmToken Notification');
    }
    if (!supervisorDoc) {
      supervisorDoc = (await Promise.all(
        supervisorModels.map((Model) => Model.findById(supervisorId).select('fcmToken Notification'))
      )).find(Boolean);
    }

    if (!supervisorDoc) {
      console.warn(`[Notification] Supervisor not found: ${supervisorId}. Skipping daily trip end notification.`);
      return;
    }

    const tokens = (supervisorDoc.fcmToken || [])
      .map(t => (typeof t === 'object' && t !== null ? t.token : t))
      .filter(Boolean);

    if (!tokens.length) {
      console.warn(`[Notification] No registered FCM tokens found for supervisor: ${supervisorId}. Skipping daily trip end notification.`);
      return;
    }

    const vehStr = vehicleNumber ? ` for vehicle ${vehicleNumber}` : "";
    const driverName = driver?.name || "Driver";

    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title: 'Daily Trip Ended',
        body: `${driverName} has ended daily trip${vehStr}.`
      },
      data: {
        type: 'DAILY_TRIP_ENDED',
        tripId: tripData?._id ? tripData._id.toString() : "",
        driverId: driver?._id ? driver._id.toString() : "",
        driverName: String(driverName),
        vehicleNumber: String(vehicleNumber || ""),
        odometerEnd: tripData?.odometerEnd != null ? String(tripData.odometerEnd) : "",
        gpsKM: tripData?.gpsKM != null ? String(tripData.gpsKM) : "0",
        totalDistance: tripData?.totalDistance != null ? String(tripData.totalDistance) : "0"
      }
    });

    console.log(`[Notification] Daily trip end notification SENT to Supervisor ${supervisorId}. Success: ${response.successCount}, Failure: ${response.failureCount}`);

    const failedTokens = filterUnregisteredTokens(response, tokens);
    if (failedTokens.length) {
      const supervisorModelClass = supervisorDoc.constructor;
      await supervisorModelClass.findByIdAndUpdate(supervisorId, {
        $pull: { fcmToken: { $in: failedTokens } }
      });
    }
  } catch (error) {
    console.error(`[Notification] Critical daily trip end notification error for supervisor ${supervisorId}:`, error);
  }
};

const notifySupervisorVehicleExpense = async (supervisorId, supervisorModel, driver, expense) => {
  try {
    if (supervisorId) {
      const canNotify = await checkSupervisorNotificationPermission(
        supervisorId,
        supervisorModel || driver?.supervisorModel,
        "vehicle_expense"
      );
      if (!canNotify) {
        console.warn(`[Notification] NOT SENT to Supervisor ${supervisorId}. Reason: Supervisor permission 'vehicle_expense' is disabled or missing.`);
        return;
      }
    }

    const sModel = supervisorModel || driver?.supervisorModel;
    let supervisorDoc = null;
    if (sModel && modelMap[sModel]) {
      supervisorDoc = await modelMap[sModel].findById(supervisorId).select('fcmToken Notification');
    }
    if (!supervisorDoc) {
      supervisorDoc = (await Promise.all(
        supervisorModels.map((Model) => Model.findById(supervisorId).select('fcmToken Notification'))
      )).find(Boolean);
    }

    if (!supervisorDoc) {
      console.warn(`[Notification] Supervisor not found: ${supervisorId}. Skipping vehicle expense notification.`);
      return;
    }

    const tokens = (supervisorDoc.fcmToken || [])
      .map(t => (typeof t === 'object' && t !== null ? t.token : t))
      .filter(Boolean);

    if (!tokens.length) {
      console.warn(`[Notification] No registered FCM tokens found for supervisor: ${supervisorId}. Skipping vehicle expense notification.`);
      return;
    }

    const driverName = driver?.name || "Driver";
    const amountStr = expense?.amount != null ? `₹${expense.amount}` : "";
    const typeStr = expense?.expenseType ? ` (${expense.expenseType})` : "";
    const vehicleStr = driver?.deviceId?.vehicleNumber || expense?.vehicleName ? ` for vehicle ${driver?.deviceId?.vehicleNumber || expense?.vehicleName}` : "";

    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title: 'New Vehicle Expense Added',
        body: `${driverName} added a vehicle expense of ${amountStr}${typeStr}${vehicleStr}.`
      },
      data: {
        type: 'VEHICLE_EXPENSE_ADDED',
        expenseId: expense?._id ? expense._id.toString() : "",
        driverId: driver?._id ? driver._id.toString() : "",
        driverName: String(driverName),
        amount: expense?.amount != null ? String(expense.amount) : "",
        expenseType: String(expense?.expenseType || ""),
        vehicleName: String(driver?.deviceId?.vehicleNumber || expense?.vehicleName || "")
      }
    });

    console.log(`[Notification] Vehicle expense notification SENT to Supervisor ${supervisorId}. Success: ${response.successCount}, Failure: ${response.failureCount}`);

    const failedTokens = filterUnregisteredTokens(response, tokens);
    if (failedTokens.length) {
      const supervisorModelClass = supervisorDoc.constructor;
      await supervisorModelClass.findByIdAndUpdate(supervisorId, {
        $pull: { fcmToken: { $in: failedTokens } }
      });
    }
  } catch (error) {
    console.error(`[Notification] Critical vehicle expense notification error for supervisor ${supervisorId}:`, error);
  }
};

const notifySupervisorDriverExpense = async (supervisorId, supervisorModel, driver, expense) => {
  try {
    if (supervisorId) {
      const canNotify = await checkSupervisorNotificationPermission(
        supervisorId,
        supervisorModel || driver?.supervisorModel,
        "driver_expense"
      );
      if (!canNotify) {
        console.warn(`[Notification] NOT SENT to Supervisor ${supervisorId}. Reason: Supervisor permission 'driver_expense' is disabled or missing.`);
        return;
      }
    }

    const sModel = supervisorModel || driver?.supervisorModel;
    let supervisorDoc = null;
    if (sModel && modelMap[sModel]) {
      supervisorDoc = await modelMap[sModel].findById(supervisorId).select('fcmToken Notification');
    }
    if (!supervisorDoc) {
      supervisorDoc = (await Promise.all(
        supervisorModels.map((Model) => Model.findById(supervisorId).select('fcmToken Notification'))
      )).find(Boolean);
    }

    if (!supervisorDoc) {
      console.warn(`[Notification] Supervisor not found: ${supervisorId}. Skipping driver expense notification.`);
      return;
    }

    const tokens = (supervisorDoc.fcmToken || [])
      .map(t => (typeof t === 'object' && t !== null ? t.token : t))
      .filter(Boolean);

    if (!tokens.length) {
      console.warn(`[Notification] No registered FCM tokens found for supervisor: ${supervisorId}. Skipping driver expense notification.`);
      return;
    }

    const driverName = driver?.name || "Driver";
    const amountStr = expense?.amount != null ? `₹${expense.amount}` : "";
    const shopStr = expense?.shopName ? ` (${expense.shopName})` : "";

    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title: 'New Driver Expense Added',
        body: `${driverName} added a driver expense of ${amountStr}${shopStr}.`
      },
      data: {
        type: 'DRIVER_EXPENSE_ADDED',
        expenseId: expense?._id ? expense._id.toString() : "",
        driverId: driver?._id ? driver._id.toString() : "",
        driverName: String(driverName),
        amount: expense?.amount != null ? String(expense.amount) : "",
        shopName: String(expense?.shopName || ""),
        vehicleName: String(driver?.deviceId?.vehicleNumber || expense?.vehicleName || "")
      }
    });

    console.log(`[Notification] Driver expense notification SENT to Supervisor ${supervisorId}. Success: ${response.successCount}, Failure: ${response.failureCount}`);

    const failedTokens = filterUnregisteredTokens(response, tokens);
    if (failedTokens.length) {
      const supervisorModelClass = supervisorDoc.constructor;
      await supervisorModelClass.findByIdAndUpdate(supervisorId, {
        $pull: { fcmToken: { $in: failedTokens } }
      });
    }
  } catch (error) {
    console.error(`[Notification] Critical driver expense notification error for supervisor ${supervisorId}:`, error);
  }
};

const notifySupervisorVendorExpense = async (supervisorId, supervisorModel, vendorInput, vendorLog) => {
  try {
    let vendor = vendorInput;
    if (vendorInput && typeof vendorInput === 'object' && vendorInput.vendorName) {
      vendor = vendorInput;
    } else if (vendorInput) {
      vendor = await Vendor.findById(vendorInput).select('vendorName supervisorModel supervisorId');
    }

    const targetSupervisorId = supervisorId || vendor?.supervisorId;
    const sModel = supervisorModel || vendor?.supervisorModel;

    if (!targetSupervisorId) {
      console.warn(`[Notification] NOT SENT: supervisorId is missing for vendor log notification.`);
      return;
    }

    const canNotify = await checkSupervisorNotificationPermission(
      targetSupervisorId,
      sModel,
      "vendor_expense"
    );
    if (!canNotify) {
      console.warn(`[Notification] NOT SENT to Supervisor ${targetSupervisorId}. Reason: Supervisor permission 'vendor_expense' is disabled or missing.`);
      return;
    }

    let supervisorDoc = null;
    if (sModel && modelMap[sModel]) {
      supervisorDoc = await modelMap[sModel].findById(targetSupervisorId).select('fcmToken Notification');
    }
    if (!supervisorDoc) {
      supervisorDoc = (await Promise.all(
        supervisorModels.map((Model) => Model.findById(targetSupervisorId).select('fcmToken Notification'))
      )).find(Boolean);
    }

    if (!supervisorDoc) {
      console.warn(`[Notification] Supervisor not found: ${targetSupervisorId}. Skipping vendor log notification.`);
      return;
    }

    const tokens = (supervisorDoc.fcmToken || [])
      .map(t => (typeof t === 'object' && t !== null ? t.token : t))
      .filter(Boolean);

    if (!tokens.length) {
      console.warn(`[Notification] No registered FCM tokens found for supervisor: ${targetSupervisorId}. Skipping vendor log notification.`);
      return;
    }

    const vendorName = vendor?.vendorName || "Vendor";
    const amountStr = vendorLog?.amount != null && Number(vendorLog.amount) > 0 ? ` of ₹${vendorLog.amount}` : "";

    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title: 'New Vendor Log Created',
        body: `${vendorName} created a new vendor log${amountStr}.`
      },
      data: {
        type: 'VENDOR_LOG_CREATED',
        logId: vendorLog?._id ? vendorLog._id.toString() : "",
        vendorId: vendor?._id ? vendor._id.toString() : (vendorLog?.vendorId ? vendorLog.vendorId.toString() : ""),
        vendorName: String(vendorName),
        amount: vendorLog?.amount != null ? String(vendorLog.amount) : "",
        description: String(vendorLog?.description || "")
      }
    });

    console.log(`[Notification] Vendor log notification SENT to Supervisor ${targetSupervisorId}. Success: ${response.successCount}, Failure: ${response.failureCount}`);

    const failedTokens = filterUnregisteredTokens(response, tokens);
    if (failedTokens.length) {
      const supervisorModelClass = supervisorDoc.constructor;
      await supervisorModelClass.findByIdAndUpdate(targetSupervisorId, {
        $pull: { fcmToken: { $in: failedTokens } }
      });
    }
  } catch (error) {
    console.error(`[Notification] Critical vendor log notification error for supervisor ${supervisorId}:`, error);
  }
};

const notifySupervisorVendorTaskUpdate = async (supervisorId, supervisorModel, vendorInput, vendorLog) => {
  try {
    let vendor = vendorInput;
    if (vendorInput && typeof vendorInput === 'object' && vendorInput.vendorName) {
      vendor = vendorInput;
    } else if (vendorInput) {
      vendor = await Vendor.findById(vendorInput).select('vendorName supervisorModel supervisorId');
    }

    const targetSupervisorId = supervisorId || vendor?.supervisorId || vendorLog?.supervisorId;
    const sModel = supervisorModel || vendor?.supervisorModel;

    if (!targetSupervisorId) {
      console.warn(`[Notification] NOT SENT: supervisorId is missing for vendor task update notification.`);
      return;
    }

    const canNotify = await checkSupervisorNotificationPermission(
      targetSupervisorId,
      sModel,
      "vendor_task_update"
    );
    if (!canNotify) {
      console.warn(`[Notification] NOT SENT to Supervisor ${targetSupervisorId}. Reason: Supervisor permission 'vendor_task_update' is disabled or missing.`);
      return;
    }

    let supervisorDoc = null;
    if (sModel && modelMap[sModel]) {
      supervisorDoc = await modelMap[sModel].findById(targetSupervisorId).select('fcmToken Notification');
    }
    if (!supervisorDoc) {
      supervisorDoc = (await Promise.all(
        supervisorModels.map((Model) => Model.findById(targetSupervisorId).select('fcmToken Notification'))
      )).find(Boolean);
    }

    if (!supervisorDoc) {
      console.warn(`[Notification] Supervisor not found: ${targetSupervisorId}. Skipping vendor task update notification.`);
      return;
    }

    const tokens = (supervisorDoc.fcmToken || [])
      .map(t => (typeof t === 'object' && t !== null ? t.token : t))
      .filter(Boolean);

    if (!tokens.length) {
      console.warn(`[Notification] No registered FCM tokens found for supervisor: ${targetSupervisorId}. Skipping vendor task update notification.`);
      return;
    }

    const vendorName = vendor?.vendorName || "Vendor";
    const actionStr = vendorLog?.vendorAction ? ` (Status: ${vendorLog.vendorAction})` : "";

    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title: 'Vendor Task Updated',
        body: `${vendorName} updated a vendor task${actionStr}.`
      },
      data: {
        type: 'VENDOR_TASK_UPDATED',
        logId: vendorLog?._id ? vendorLog._id.toString() : "",
        vendorId: vendor?._id ? vendor._id.toString() : (vendorLog?.vendorId ? vendorLog.vendorId.toString() : ""),
        vendorName: String(vendorName),
        vendorAction: String(vendorLog?.vendorAction || ""),
        amount: vendorLog?.amount != null ? String(vendorLog.amount) : "",
        description: String(vendorLog?.description || "")
      }
    });

    console.log(`[Notification] Vendor task update notification SENT to Supervisor ${targetSupervisorId}. Success: ${response.successCount}, Failure: ${response.failureCount}`);

    const failedTokens = filterUnregisteredTokens(response, tokens);
    if (failedTokens.length) {
      const supervisorModelClass = supervisorDoc.constructor;
      await supervisorModelClass.findByIdAndUpdate(targetSupervisorId, {
        $pull: { fcmToken: { $in: failedTokens } }
      });
    }
  } catch (error) {
    console.error(`[Notification] Critical vendor task update notification error for supervisor ${supervisorId}:`, error);
  }
};

module.exports = {
  notifyVendor,
  notifyDriverBuiltyAssignment,
  notifySupervisorAttendance,
  notifySupervisorBuiltyCreatedByWorker,
  notifySupervisorBuiltyDispatched,
  notifySupervisorBuiltyCompleted,
  notifySupervisorBuiltyCancelled,
  notifySupervisorDailyTripStart,
  notifySupervisorDailyTripEnd,
  notifySupervisorVehicleExpense,
  notifySupervisorDriverExpense,
  notifySupervisorVendorExpense,
  notifySupervisorVendorTaskUpdate,
  checkSupervisorNotificationPermission
};
