const admin = require('../config/firebaseConfig');
const Vendor = require('../model/vendor');
const Driver = require('../model/driverModel');
const School = require('../model/school');
const Branch = require('../model/branch');
const BranchGroup = require('../model/branchGroup');
const NotificationPermissions = require('../model/notificationPermissionsSchema');

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
        title: "New task  for vendor",
        body: `Builty ${builtyData.tpNo} is ready for you.`
      },
      data: {
        type: "NEW_BUILTY",
        builtyId: builtyData._id.toString(),
        tpNo: builtyData.tpNo
      }
    };

    const tokens = vendor.fcmTokens.map(item => item.token);
    const response = await admin.messaging().sendEachForMulticast({
      tokens: tokens,
      ...message
    });
    
    console.log(`[Notification] SENT to Vendor ${vendorId}. Dispatch complete. Success: ${response.successCount}, Failure: ${response.failureCount}`);

    // 5. Handle errors/invalid tokens
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
        }
      });
      
      if (failedTokens.length > 0) {
        await Vendor.findByIdAndUpdate(vendorId, {
          $pull: { fcmTokens: { token: { $in: failedTokens } } }
        });
      }
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

    if (!driver?.fcmTokens?.length) {      console.warn(`[Notification] NOT SENT to Driver ${driverId}. Reason: No registered FCM tokens found.`);

      return;
    }

    const tokens = driver.fcmTokens.map((item) => item.token).filter(Boolean);
    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title: 'New Builty Assigned driver',
        body: `Builty ${builtyData.tpNo} has been assigned to you.`
      },
      data: {
        type: 'NEW_BUILTY_ASSIGNED',
        builtyId: builtyData._id.toString(),
        tpNo: builtyData.tpNo
      }
    });

    console.log(`[Notification] SENT to Driver ${driverId}. Dispatch complete. Success: ${response.successCount}, Failure: ${response.failureCount}`);

    const failedTokens = response.responses
      .map((resp, index) => (!resp.success ? tokens[index] : null))
      .filter(Boolean);

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
        body: `${driver.name} has marked attendance.`
      },
      data: {
        type: 'ATTENDANCE_MARKED',
        attendanceId: attendance._id.toString(),
        driverId: driver._id.toString(),
        driverName: driver.name,
        status: attendance.status
      }
    });

    console.log(`[Notification] Attendance dispatch complete. Success: ${response.successCount}, Failure: ${response.failureCount}`);

    const failedTokens = response.responses
      .map((resp, index) => (!resp.success ? tokens[index] : null))
      .filter(Boolean);

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

const modelMap = {
  School,
  Branch,
  BranchGroup
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
        body: `Builty ${builtyData.tpNo} was created by ${workerName || 'Worker'}.`
      },
      data: {
        type: 'WORKER_BUILTY_CREATED',
        builtyId: builtyData._id.toString(),
        tpNo: builtyData.tpNo
      }
    });

    console.log(`[Notification] Worker builty notification SENT to Supervisor ${supervisorId}. Dispatch complete. Success: ${response.successCount}, Failure: ${response.failureCount}`);

    const failedTokens = response.responses
      .map((resp, index) => (!resp.success ? tokens[index] : null))
      .filter(Boolean);

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
        body: `Builty ${builtyData.tpNo} has been dispatched by ${dispatchedByName || roleTitle}.`
      },
      data: {
        type: "BUILTY_DISPATCHED",
        builtyId: builtyData._id.toString(),
        tpNo: builtyData.tpNo
      }
    };

    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      ...message
    });

    console.log(`[Notification] Dispatch notification SENT to Supervisor ${supervisorId}. Success: ${response.successCount}, Failure: ${response.failureCount}`);

    const failedTokens = response.responses
      .map((resp, index) => (!resp.success ? tokens[index] : null))
      .filter(Boolean);

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
        body: `Builty ${builtyData.tpNo} has been completed by ${completedByName || roleTitle}.`
      },
      data: {
        type: "BUILTY_COMPLETED",
        builtyId: builtyData._id.toString(),
        tpNo: builtyData.tpNo
      }
    };

    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      ...message
    });

    console.log(`[Notification] Completed notification SENT to Supervisor ${supervisorId}. Success: ${response.successCount}, Failure: ${response.failureCount}`);

    const failedTokens = response.responses
      .map((resp, index) => (!resp.success ? tokens[index] : null))
      .filter(Boolean);

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
        body: `Builty ${builtyData.tpNo} has been cancelled by ${cancelledByName || roleTitle}.`
      },
      data: {
        type: "BUILTY_CANCELLED",
        builtyId: builtyData._id.toString(),
        tpNo: builtyData.tpNo,
        cancelReason: builtyData.cancelReason || ""
      }
    };

    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      ...message
    });

    console.log(`[Notification] Cancelled notification SENT to Supervisor ${supervisorId}. Success: ${response.successCount}, Failure: ${response.failureCount}`);

    const failedTokens = response.responses
      .map((resp, index) => (!resp.success ? tokens[index] : null))
      .filter(Boolean);

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

module.exports = {
  notifyVendor,
  notifyDriverBuiltyAssignment,
  notifySupervisorAttendance,
  notifySupervisorBuiltyCreatedByWorker,
  notifySupervisorBuiltyDispatched,
  notifySupervisorBuiltyCompleted,
  notifySupervisorBuiltyCancelled,
  checkSupervisorNotificationPermission
};

