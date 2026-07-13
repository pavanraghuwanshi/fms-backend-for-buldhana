const AuditLog = require('../model/AuditLog');

const logAction = async (logData) => {
    try {

        await AuditLog.create({
            userId: logData.userId,
            userType: logData.userType,
            action: logData.action,
            module: logData.module,
            recordId: logData.recordId,
            oldData: logData.oldData || null,
            newData: logData.newData || null,
            ipAddress: logData.ipAddress,
            userAgent: logData.userAgent,
            deviceId: logData.deviceId || null,
            apiEndpoint: logData.apiEndpoint,
            requestMethod: logData.requestMethod,
            latitude: logData.latitude ?? null,
            longitude: logData.longitude ?? null,
            status: logData.status,
            loginId: logData.loginId || null,
            createdAt: new Date()
        });
    } catch (error) {
        console.error('CRITICAL: Failed to write audit log to database:', error);
    }
};

module.exports = { logAction };