const admin = require('firebase-admin');
const Vendor = require('../model/vendor');

const notifyVendor = async (vendorId, builtyData) => {
  try {
    console.log(`[Notification] Initiating for Vendor: ${vendorId}`);

    // 1. Fetch vendor
    const vendor = await Vendor.findById(vendorId).select('+fcmTokens');
    console.log(`[Notification] Vendor record retrieved.`);

    // 2. Check for tokens
    if (!vendor?.fcmTokens || vendor.fcmTokens.length === 0) {
      console.warn(`[Notification] No registered FCM tokens found for Vendor: ${vendorId}. Skipping.`);
      return;
    }
    console.log(`[Notification] Found ${vendor.fcmTokens.length} active tokens for vendor.`);

    // 3. Prepare payload
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
    console.log(`[Notification] Payload prepared for Builty: ${builtyData.tpNo}`);

    // 4. Send multicast
    const tokens = vendor.fcmTokens.map(item => item.token);
    console.log(`[Notification] Dispatching multicast to ${tokens.length} devices.`);

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
          console.error(`[Notification] Token at index ${idx} failed:`, resp.error);
          failedTokens.push(tokens[idx]);
        }
      });
      
      if (failedTokens.length > 0) {
        console.log(`[Notification] Cleaning up ${failedTokens.length} invalid tokens from DB.`);
        await Vendor.findByIdAndUpdate(vendorId, {
          $pull: { fcmTokens: { token: { $in: failedTokens } } }
        });
        console.log(`[Notification] Cleanup successful.`);
      }
    }
    
  } catch (error) {
    console.error(`[Notification] Critical error for vendor ${vendorId}:`, error);
  }
};

module.exports = { notifyVendor };