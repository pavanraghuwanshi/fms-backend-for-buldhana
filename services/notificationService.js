const admin = require('../config/firebaseConfig');
const Vendor = require('../model/vendor');

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

module.exports = { notifyVendor };