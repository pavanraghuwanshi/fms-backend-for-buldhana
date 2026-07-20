const admin = require('../config/firebaseConfig');
const Vendor = require('../model/vendor');
const School = require('../model/school');
const Branch = require('../model/branch');
const BranchGroup = require('../model/branchGroup');

const notifyVendor = async (vendorId, builtyData) => {
  try {

    const vendor = await Vendor.findById(vendorId).select('+fcmTokens');
    console.log(`[Notification] Vendor record retrieved.`);

    if (!vendor?.fcmTokens || vendor.fcmTokens.length === 0) {
      console.warn(`[Notification] No registered FCM tokens found for Vendor: ${vendorId}. Skipping.`);
      return;
    }

    const message = {
      notification: {
        title: "New Builty Assigned",
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
    
    console.log(`[Notification] Dispatch complete. Success: ${response.successCount}, Failure: ${response.failureCount}`);

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
    console.error(`[Notification] Critical error for vendor ${vendorId}:`, error);
  }
};

const supervisorModels = [School, Branch, BranchGroup];

const notifySupervisorAttendance = async (supervisorId, driver, attendance) => {
  try {
    const supervisor = (await Promise.all(
      supervisorModels.map((Model) => Model.findById(supervisorId).select('Notification fcmToken'))
    )).find(Boolean);


    if (!supervisor) {
      console.warn(`[Notification] Supervisor not found: ${supervisorId}. Skipping attendance notification.`);
      return;
    }

    if (supervisor.Notification !== true) {
      console.log(`[Notification] Attendance notifications are disabled for supervisor: ${supervisorId}.`);
      return;
    }

    const tokens = (supervisor.fcmToken || []).filter(Boolean);
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
      const supervisorModel = supervisor.constructor;
      await supervisorModel.findByIdAndUpdate(supervisorId, {
        $pull: { fcmToken: { $in: failedTokens } }
      });
    }
  } catch (error) {
    console.error(`[Notification] Critical attendance notification error for supervisor ${supervisorId}:`, error);
  }
};

module.exports = { notifyVendor, notifySupervisorAttendance };
