const WorkerRole = require('../model/WorkerRole');
const Worker = require('../model/workerModel');
const mongoose = require('mongoose');
const _ = require('lodash');

const getMergedPermissions = (roleDoc) => {

    const fullPermissions = _.cloneDeep(PERMISSION_TEMPLATE);
    const data = roleDoc.toObject ? roleDoc.toObject({ flattenMaps: true }) : roleDoc;
    if (data.permissions) {
        _.merge(fullPermissions, data.permissions);
    }
    if (data.customPermissions) {
        _.merge(fullPermissions, data.customPermissions);
    }
    return fullPermissions;
};


exports.saveWorkerRole = async (req, res) => {
    try {
        const { workerId, permissions, categoryName, customPermissions } = req.body;

        const allowedRoles = ["superadmin", "user"];
        if (!req.user?.role || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: "Unauthorized Access" });
        }

        if (!workerId || !permissions) {
            return res.status(400).json({ success: false, message: "Missing required fields: workerId or permissions" });
        }

        if (!mongoose.Types.ObjectId.isValid(workerId)) {
            return res.status(400).json({ success: false, message: "Invalid workerId format" });
        }

        const workerExists = await Worker.findById(workerId);
        if (!workerExists) {
            return res.status(404).json({ success: false, message: "Worker not found" });
        }

        const updateQuery = { $set: { permissions: permissions } };


        if (customPermissions && typeof customPermissions === 'object') {
            Object.entries(customPermissions).forEach(([key, val]) => {
                updateQuery.$set[`customPermissions.${key}`] = val;
            });
        }

        else if (categoryName) {
            updateQuery.$set[`customPermissions.${categoryName}`] = permissions;
        }

        const role = await WorkerRole.findOneAndUpdate(
            { assignedWorkers: workerId },
            updateQuery,
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        return res.status(200).json({
            success: true,
            message: "Permissions updated successfully",
            permissions: getMergedPermissions(role)
        });

    } catch (error) {
        console.error("SaveRoleError:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

exports.getMyPermissions = async (req, res) => {
    try {
        const workerId = req.user.id;
        if (!mongoose.Types.ObjectId.isValid(workerId)) {
            return res.status(400).json({ success: false, message: "Invalid ID format" });
        }

        const roleDoc = await WorkerRole.findOne({ assignedWorkers: workerId });

        // If no document exists, return the base template
        if (!roleDoc) {
            return res.status(200).json({ success: true, permissions: PERMISSION_TEMPLATE });
        }

        return res.status(200).json({
            success: true,
            permissions: getMergedPermissions(roleDoc)
        });
    } catch (error) {
        console.error("GetByIdError:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

exports.getPermissionsByWorkerId = async (req, res) => {
    try {
        const allowedRoles = ["user"];
        if (!req.user?.role || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: "Unauthorized Access" });
        }

        const { workerId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(workerId)) {
            return res.status(400).json({ success: false, message: "Invalid ID format" });
        }

        const roleDoc = await WorkerRole.findOne({ assignedWorkers: workerId });

        if (!roleDoc) {
            return res.status(200).json({ success: true, permissions: PERMISSION_TEMPLATE });
        }

        return res.status(200).json({
            success: true,
            permissions: getMergedPermissions(roleDoc)
        });
    } catch (error) {
        console.error("GetByIdError:", error);
        res.status(500).json({ success: false, message: "Internal server error", error: error.message });
    }
};

exports.deleteWorkerRole = async (req, res) => {
    try {
        const allowedRoles = ["school", "branch", "branchGroup"];
        if (!req.user || !allowedRoles.includes(req.user.roleType)) {
            return res.status(403).json({
                success: false,
                message: "Access denied: Only schools, branches, and branch groups can perform this action."
            });
        }

        const { workerId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(workerId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid worker ID"
            });
        }

        const role = await WorkerRole.findOne(
            { assignedWorkers: workerId },
            { _id: 1 }
        );

        if (!role) {
            return res.status(404).json({
                success: false,
                message: "No role mapping found for this worker"
            });
        }

        await WorkerRole.findByIdAndDelete(role._id);

        return res.status(200).json({
            success: true,
            message: "Worker role deleted successfully"
        });

    } catch (error) {
        console.error("DeleteWorkerRoleError:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


const PERMISSION_TEMPLATE = {
    masters: {
        driver: { create: false, read: false, update: false, delete: false },
        vehicle: { create: false, read: false, update: false, delete: false },
        trip: { create: false, read: false, update: false, delete: false },
        location: { create: false, read: false, update: false, delete: false },
        company: { create: false, read: false, update: false, delete: false },
        materialOwner: { create: false, read: false, update: false, delete: false },
        vendor: { create: false, read: false, update: false, delete: false },
        employee: { create: false, read: false, update: false, delete: false },
        consignor: { create: false, read: false, update: false, delete: false },
        consignee: { create: false, read: false, update: false, delete: false },
        transporter: { create: false, read: false, update: false, delete: false },
        commAgent: { create: false, read: false, update: false, delete: false },
        category: { create: false, read: false, update: false, delete: false },
        attendance: { create: false, read: false, update: false, delete: false },
        leave: { create: false, read: false, update: false, delete: false },
        zone: { create: false, read: false, update: false, delete: false },
        customer: { create: false, read: false, update: false, delete: false }
    },
    reports: {
        salary: { create: false, read: false, update: false, delete: false },
        driverExp: { create: false, read: false, update: false, delete: false },
        vehicleExp: { create: false, read: false, update: false, delete: false },
        dailyLog: { create: false, read: false, update: false, delete: false },
        serviceLog: { create: false, read: false, update: false, delete: false },
        inspection: { create: false, read: false, update: false, delete: false }
    },
    dailyTrips: { create: false, read: false, update: false, delete: false },
    goodReceipts: {
        rail: { create: false, read: false, update: false, delete: false },
        road: { create: false, read: false, update: false, delete: false }
    },
    dailyPass: {
        builty: {create: false, read: false, update: false, delete: false}
    },
    transportPass: {
        receipt: { create: false, read: false, update: false, delete: false },
        builty: { create: false, read: false, update: false, delete: false },
        dailyPassbuilty: { create: false, read: false, update: false, delete: false },
    },
    warehouse: {
        product: { create: false, read: false, update: false, delete: false },
        railHead: { create: false, read: false, update: false, delete: false },
        inventory: { create: false, read: false, update: false, delete: false },
        dailyproduct: { create: false, read: false, update: false, delete: false },
    },
    tickets: {
        raise: { create: false, read: false, update: false, delete: false },
        answer: { create: false, read: false, update: false, delete: false }
    },
    chat: { read: false }
};