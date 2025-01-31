const express = require('express');
const { createStorage } = require('../services/storage');
const { storageConfig } = require('../config/storage');

const router = express.Router();
const storage = createStorage(storageConfig);

router.get('/:filename', async (req, res) => {
    const { filename } = req.params;
    
    try {
        // First try to get a signed URL for direct download
        try {
            const url = await storage.getDownloadUrl(filename);
            // Redirect to signed URL for direct download from S3
            return res.redirect(url);
        } catch (err) {
            console.log('Failed to get signed URL, falling back to proxy download:', err);
        }

        // Fall back to proxy download if signed URL fails
        const file = await storage.getFile(filename);
        
        // Set headers for file download
        res.setHeader('Content-Type', file.contentType || 'application/octet-stream');
        res.setHeader('Content-Length', file.contentLength);
        res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
        
        // Send the file data
        res.end(file.data);
    } catch (err) {
        console.error('Download error:', err);
        if (err.message === 'File not found') {
            res.status(404).send('File not found');
        } else {
            res.status(500).send('Error downloading file');
        }
    }
});

module.exports = router;