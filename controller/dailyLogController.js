const { default: mongoose } = require('mongoose');
const History = require('../model/credenceHistoryModel');
const DailyLog = require('../model/dailyLogModel');
const DailyLogSignatureImage = require('../model/dailyLogSignatureImageModel'); // adjust path if needed
const Device = require('../model/deviceModel');
const Driver = require('../model/driverModel');
const { compressImage, getDuration } = require('../utils/helperFunctions');

exports.createDailyLog = async (req, res) => {
    try {
        if (req.user.role !== "driver" && req.user.role !== "user") {
            return res.status(403).json({ success: false, message: "Unauthorized access" });
        }
        let driverId;
        const { startDate, endDate, logKM } = req.body;

        if (req.user.role === "driver") {
            driverId = req.user.id;
        } else if (req.user.role === "user") {
            driverId = req.query.driverId;
        }

        if (!driverId) {
            return res.status(400).json({ message: "Driver ID is required" });
        }

        const driver = await Driver.findById(driverId);
        if (!driver) {
            return res.status(404).json({ success: false, message: "Driver not found" });
        }
        if (!driver.currentTripId) {
            return res.status(400).json({ success: false, message: "Driver is not on a trip" });
        }
        if (!driver.currentVehicle) {
            return res.status(400).json({ success: false, message: "Driver does not have a vehicle" });
        }

        const device = await Device.findById(driver.currentVehicle).select('-_id deviceId');
        if (!device) {
            return res.status(404).json({ success: false, message: "Device not found" });
        }

        const getGPSDistance = async (deviceId, startDate, endDate) => {
            try {
                const query = {
                    deviceId: deviceId,
                    createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
                    "attributes.totalDistance": { $exists: true },
                };

                const [firstEntry, lastEntry] = await Promise.all([
                    History.findOne(query)
                        .sort({ createdAt: 1 })
                        .select("attributes.totalDistance")
                        .lean(),
                    History.findOne(query)
                        .sort({ createdAt: -1 })
                        .select("attributes.totalDistance")
                        .lean(),
                ]);

                const gpsKM = (((lastEntry?.attributes?.totalDistance || 0) - (firstEntry?.attributes?.totalDistance || 0)) / 1000).toFixed(2);

                return {
                    gpsKM,
                    startOdometerReading: (firstEntry?.attributes?.totalDistance) / 1000 || 0,
                    endOdometerReading: (lastEntry?.attributes?.totalDistance) / 1000 || 0,
                };
            } catch (error) {
                console.error("Error calculating GPS distance:", error.message);
                return 0;
            }
        };
        const { gpsKM, startOdometerReading, endOdometerReading } = await getGPSDistance(device.deviceId, startDate, endDate)

        const signatureImg = req.file;
        let signatureImageDoc;

        if (signatureImg) {
            signatureImageDoc = await DailyLogSignatureImage.create({
                signatureImg: await compressImage(signatureImg),
            });
        }

        const newLog = await DailyLog.create({
            driverId: driverId,
            vehicleId: driver.currentVehicle,
            vehicleName: driver.currentVehicleName,
            startDate,
            endDate,
            logKM,
            gpsKM: gpsKM || 0,
            startOdometerReading,
            endOdometerReading,
            ...(signatureImageDoc && { signatureId: signatureImageDoc?._id }),
        });

        return res.status(201).json(newLog);
    } catch (error) {
        console.error("Error creating daily log:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};

exports.getSignatureImageById = async (req, res) => {
    try {
        const imageDoc = await DailyLogSignatureImage.findById(req.params.id).select('-_id');
        if (!imageDoc) return res.status(404).json({ message: "Signature image not found" });
        return res.json(imageDoc);
    } catch (error) {
        return res.status(500).json({ message: "Error retrieving image metadata", error: error.message });
    }
};

exports.getDailyLogsMonthWiseByDriverId = async (req, res) => {
    try {
        let driverId, month;
        if (req.user.role !== "user" && req.user.role !== "driver" && req.user.role !== "superadmin") {
            return res.status(403).json({ success: false, message: "Unauthorized access" });
        }

        if (req.user.role === "user" || req.user.role === "superadmin") {
            driverId = req.query.driverId;
            month = req.query.month; // Extracting month from URL (YYYY-MM)
        } else if (req.user.role === "driver") {
            driverId = req.user.id;
            month = req.query.month; // Extracting month from URL (YYYY-MM)
        }

        if (!driverId || !month || !/^\d{4}-\d{2}$/.test(month)) {
            return res.status(400).json({ error: "Missing or invalid driverId or month (use YYYY-MM format)." });
        }

        const startDate = new Date(`${month}-01T00:00:00.000Z`);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(0);

        const logs = await DailyLog.find({
            driverId,
            createdAt: { $gte: startDate, $lte: endDate },
        }).sort({ startDate: 1 }).select('vehicleName startDate endDate logKM gpsKM startOdometerReading endOdometerReading createdAt signatureId').populate({
            path: 'driverId',
            select: 'name',
        }).lean();

        if (logs.length === 0) {
            return res.status(404).json({ message: "No logs found for this month" });
        }

        return res.status(200).json(logs.map(log => ({
            ...log,
            duration: getDuration(log.startDate, log.endDate),
        })));
    } catch (error) {
        console.error("Error fetching logs:", error.message);
        return res.status(500).json({ message: "Server error" + error.message });
    }
};

exports.updateDailyLog = async (req, res) => {
    try {
        const logId = req.params.id;

        if (!logId) {
            return res.status(400).json({ success: false, message: "Missing Daily Log ID" });
        }

        const log = await DailyLog.findById(logId);
        if (!log) {
            return res.status(404).json({ success: false, message: "Daily log not found" });
        }

        if (req.user.role !== "driver" && req.user.role !== "user") {
            return res.status(403).json({ success: false, message: "Unauthorized access" });
        }

        let driverId;

        if (req.user.role === "driver") {
            driverId = req.user.id;
            if (log.driverId.toString() !== driverId) {
                return res.status(403).json({ success: false, message: "Unauthorized: Daily log does not belong to the specified driver" });
            }
        }
        let signatureImageDoc;
        if (req.file) {
            if (log.signatureId) {
                // Update existing signature image
                await DailyLogSignatureImage.findByIdAndUpdate(
                    log.signatureId,
                    {
                        signatureImg: await compressImage(req.file),
                    },
                    { new: true }
                );
            } else {
                // Create new signature image and update log's reference
                const newSignature = await DailyLogSignatureImage.create({
                    signatureImg: await compressImage(req.file),
                });

                log.signatureId = newSignature._id;
                await log.save();
            }
        }

        const updatedLog = await DailyLog.findByIdAndUpdate(
            logId,
            {
                ...req.body,
                ...(signatureImageDoc && { signatureId: signatureImageDoc._id }),
            },
            { new: true }
        );

        return res.status(200).json({ success: true, message: "Daily log updated", data: updatedLog });
    } catch (error) {
        console.error("Error updating daily log:", error.message);
        return res.status(500).json({ success: false, message: "Server error" + error.message });
    }
};

exports.deleteDailyLog = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid DailyLog ID" });
        }

        const log = await DailyLog.findById(id);

        if (!log) {
            return res.status(404).json({ success: false, message: "DailyLog not found" });
        }

        if (req.user.role !== "driver" && req.user.role !== "user") {
            return res.status(403).json({ success: false, message: "Unauthorized access" });
        }

        if (req.user.role === "driver" && req.user.id !== log.driverId.toString()) {
            return res.status(403).json({ success: false, message: "Unauthorized: Daily log does not belong to the driver" });
        }


        if (log.signatureId) {
            await DailyLogSignatureImage.findByIdAndDelete(log.signatureId);
        }

        await DailyLog.findByIdAndDelete(id);

        return res.status(200).json({ success: true, message: "DailyLog deleted successfully" });
    } catch (error) {
        console.error("Error deleting DailyLog:", error.message);
        return res.status(500).json({ success: false, message: "Server error" + error.message });
    }
};


exports.getAllDailyLogs = async (req, res) => {
    try {
        // Define allowed roles
        const allowedRoles = ['driver', 'user', 'superadmin'];
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Unauthorized access' });
        }
        let filter = {};

        if (req.user.role === 'superadmin') {
            const { supervisorId } = req.query;
            if (supervisorId) {
                // Find drivers for the given supervisorId
                const drivers = await Driver.find({ supervisor: supervisorId }).select('_id').lean();
                const driverIds = drivers.map(driver => driver._id);
                if (driverIds.length === 0) {
                    return res.status(404).json({ success: false, message: 'No drivers found for this supervisor' });
                }
                filter.driverId = { $in: driverIds };
            }
            // No supervisorId: fetch all logs (no additional filter)

        } else if (req.user.role === 'user') {
            // Find drivers assigned to the logged-in user (as supervisor)
            const drivers = await Driver.find({ supervisor: req.user.id }).select('_id').lean();
            const driverIds = drivers.map(driver => driver._id);
            if (driverIds.length === 0) {
                return res.status(404).json({ success: false, message: 'No drivers assigned to this user' });
            }
            filter.driverId = { $in: driverIds };
        } else if (req.user.role === 'driver') {
            // Restrict to logs for the logged-in driver
            filter.driverId = req.user.id;
        }

        // Fetch logs with filter and population
        const logs = await DailyLog.find(filter)
            .populate({
                path: 'driverId',
                select: 'name supervisor',
            })
            .sort({ createdAt: -1 })
            .select('driverId vehicleId vehicleName startDate endDate logKM gpsKM startOdometerReading endOdometerReading createdAt signatureId')
            .lean();

        if (logs.length === 0) {
            return res.status(404).json({ success: false, message: 'No logs found' });
        }

        // Map logs to include duration
        const formattedLogs = logs.map(log => ({
            ...log,
            duration: getDuration(log.startDate, log.endDate),
        }));

        return res.status(200).json({
            success: true,
            data: formattedLogs,
        });
    } catch (error) {
        console.error('Error fetching logs:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
        });
    }
};
