// routes/documentLockerRoutes.js
const express = require('express');
const router = express.Router();
const { createDocument, getAllDocuments, getDocumentImageById, updateDocument, deleteDocument } = require('../controller/documentLockerController');
const { authenticateToken } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

router.post('/upload-document', authenticateToken, upload.single('document'), createDocument);
router.get('/get-all/:id?', authenticateToken, getAllDocuments);
router.get('/get-image-by-id/:id', authenticateToken, getDocumentImageById);
router.patch('/update/:id', authenticateToken, upload.single('document'), updateDocument);
router.delete('/delete/:id', authenticateToken, deleteDocument);

module.exports = router;
