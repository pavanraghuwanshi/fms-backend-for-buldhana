const DocumentLocker = require("../model/documentLockerModel");
const { compressImage } = require("../utils/helperFunctions");
const { logAction } = require("../utils/logger");

exports.createDocument = async (req, res) => {
    try {
        const { driverId, documentName } = req.body;
        if (!driverId || !documentName || !req.file) return res.status(400).json({ message: 'All required fields must be provided.' });

        let documentImage;
        if (req.file) {
            documentImage = await DocumentLocker.create({
                driverId,
                documentName,
                image: await compressImage(req.file)
            });
        }

        try {
            await logAction({
                userId: req.user?._id || req.user?.id,
                userType: req.user?.role || 'User',
                action: 'CREATE',
                module: 'DocumentLocker',
                recordId: documentImage?._id,
                oldData: null,
                newData: documentImage && typeof documentImage.toObject === 'function' ? documentImage.toObject() : documentImage,
                ipAddress: req.ip,
                userAgent: req.headers ? req.headers['user-agent'] : null,
                apiEndpoint: req.originalUrl,
                requestMethod: req.method,
                status: 'SUCCESS'
            });
        } catch (logError) {
            console.error("Audit log failed for createDocument:", logError);
        }

        return res.status(201).json({ message: 'Document created successfully.', document: documentImage });
    } catch (error) {
        try {
            await logAction({
                userId: req.user?._id || req.user?.id,
                userType: req.user?.role || 'System',
                action: 'CREATE',
                module: 'DocumentLocker',
                recordId: null,
                status: 'FAILED',
                ipAddress: req.ip,
                userAgent: req.headers ? req.headers['user-agent'] : null,
                apiEndpoint: req.originalUrl,
                requestMethod: req.method,
                error: error.message
            });
        } catch (logErr) {}

        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.getAllDocuments = async (req, res) => {
    try {
        if (!req.user.role) return res.status(403).json({ message: 'Unauthorized access' });

        let driverId;
        if (req.user.role === "driver") {
            driverId = req.user.id;
        } else {
            if (!req.params.id) return res.status(400).json({ message: 'Driver ID is required.' });
            driverId = req.params.id;
        }
        const documents = await DocumentLocker.find({ driverId }).select('documentName ');
        if (!documents.length) return res.status(404).json({ message: 'No documents found.' });
        return res.status(200).json({ documents });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.getDocumentImageById = async (req, res) => {
    try {
        const document = await DocumentLocker.findById(req.params.id).select('image');
        if (!document) return res.status(404).json({ message: 'Document not found.' });
        return res.status(200).json({ document });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.updateDocument = async (req, res) => {
    try {
        const { documentName } = req.body;
        const existingDoc = await DocumentLocker.findById(req.params.id).select("-image");
        const oldDocSnapshot = existingDoc && typeof existingDoc.toObject === 'function' ? existingDoc.toObject() : existingDoc;

        const updateData = {};
        if (documentName) updateData.documentName = documentName;
        if (req.file) updateData.image = await compressImage(req.file);

        const updatedDocument = await DocumentLocker.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true }
        );

        if (!updatedDocument) return res.status(404).json({ message: 'Document not found.' });

        try {
            await logAction({
                userId: req.user?._id || req.user?.id,
                userType: req.user?.role || 'User',
                action: 'UPDATE',
                module: 'DocumentLocker',
                recordId: req.params.id,
                oldData: oldDocSnapshot,
                newData: updatedDocument && typeof updatedDocument.toObject === 'function' ? updatedDocument.toObject() : updatedDocument,
                ipAddress: req.ip,
                userAgent: req.headers ? req.headers['user-agent'] : null,
                apiEndpoint: req.originalUrl,
                requestMethod: req.method,
                status: 'SUCCESS'
            });
        } catch (logError) {
            console.error("Audit log failed for updateDocument:", logError);
        }

        return res.status(200).json({ message: 'Document updated successfully.', document: updatedDocument });
    } catch (error) {
        try {
            await logAction({
                userId: req.user?._id || req.user?.id,
                userType: req.user?.role || 'System',
                action: 'UPDATE',
                module: 'DocumentLocker',
                recordId: req.params?.id || null,
                status: 'FAILED',
                ipAddress: req.ip,
                userAgent: req.headers ? req.headers['user-agent'] : null,
                apiEndpoint: req.originalUrl,
                requestMethod: req.method,
                error: error.message
            });
        } catch (logErr) {}

        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.deleteDocument = async (req, res) => {
    try {
        const deleted = await DocumentLocker.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Document not found.' });

        const oldDocSnapshot = deleted && typeof deleted.toObject === 'function' ? deleted.toObject() : deleted;

        try {
            await logAction({
                userId: req.user?._id || req.user?.id,
                userType: req.user?.role || 'User',
                action: 'DELETE',
                module: 'DocumentLocker',
                recordId: req.params.id,
                oldData: oldDocSnapshot,
                newData: null,
                ipAddress: req.ip,
                userAgent: req.headers ? req.headers['user-agent'] : null,
                apiEndpoint: req.originalUrl,
                requestMethod: req.method,
                status: 'SUCCESS'
            });
        } catch (logError) {
            console.error("Audit log failed for deleteDocument:", logError);
        }

        return res.status(200).json({ message: 'Document deleted successfully.' });
    } catch (error) {
        try {
            await logAction({
                userId: req.user?._id || req.user?.id,
                userType: req.user?.role || 'System',
                action: 'DELETE',
                module: 'DocumentLocker',
                recordId: req.params?.id || null,
                status: 'FAILED',
                ipAddress: req.ip,
                userAgent: req.headers ? req.headers['user-agent'] : null,
                apiEndpoint: req.originalUrl,
                requestMethod: req.method,
                error: error.message
            });
        } catch (logErr) {}

        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};
