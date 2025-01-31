const express = require('express');
const { createStorage } = require('../services/storage');
const { storageConfig } = require('../config/storage');

const router = express.Router();
const storage = createStorage(storageConfig);

router.get('/:filename', async (req, res) => {
    const { filename } = req.params;
    
    try {
        const file = await storage.getFile(filename);
        
        // Set headers for file download
        res.setHeader('Content-Type', file.contentType);
        res.setHeader('Content-Length', file.contentLength);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        // Stream the file data
        res.end(file.data);
    } catch (err) {
        console.error('Error:', err);
        res.status(500).send('Error downloading file');
    }
});

module.exports = router;