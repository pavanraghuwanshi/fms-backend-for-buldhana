const DocumentLocker = require("../model/documentLockerModel");
const { compressImage } = require("../utils/helperFunctions");

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

        return res.status(201).json({ message: 'Document created successfully.', document: documentImage });
    } catch (error) {
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
        const updateData = {};
        if (documentName) updateData.documentName = documentName;
        if (req.file) updateData.image = await compressImage(req.file);

        const updatedDocument = await DocumentLocker.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true }
        );

        if (!updatedDocument) return res.status(404).json({ message: 'Document not found.' });
        return res.status(200).json({ message: 'Document updated successfully.', document: updatedDocument });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.deleteDocument = async (req, res) => {
    try {
        const deleted = await DocumentLocker.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Document not found.' });
        return res.status(200).json({ message: 'Document deleted successfully.' });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};
