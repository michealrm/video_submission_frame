const express = require('express');
const { createStorage } = require('../services/storage');
const storageConfig = require('../config/storage').storageConfig;
const router = express.Router();

// Add body-parser middleware
router.use(express.json());

const storage = createStorage(storageConfig);

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

router.get('/', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.render('embed', { 
        maxDuration: storageConfig.maxDuration,
        maxDurationFormatted: formatTime(storageConfig.maxDuration)
    });
});

router.post('/presign', async (req, res) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    try {
        const { filename, contentType } = req.body;

        if (!filename || !contentType) {
            return res.status(400).json({ 
                success: false,
                error: 'Missing required fields: filename and contentType are required' 
            });
        }

        const uploadData = await storage.generateUploadUrl(filename, contentType);
        res.json({
            success: true,
            ...uploadData
        });
    } catch (error) {
        console.error('Failed to generate signed URL:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to generate upload URL'
        });
    }
});

// Add OPTIONS handler for CORS preflight
router.options('/presign', (req, res) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.sendStatus(200);
});

router.delete('/upload/:key', async (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    
    try {
        const key = decodeURIComponent(req.params.key);
        await storage.deleteFile(key);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Failed to delete file' });
    }
});

// Route to get a signed download URL
router.get('/download/:key/url', async (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    
    try {
        const key = decodeURIComponent(req.params.key);
        const url = await storage.getDownloadUrl(key);
        res.json({ 
            success: true,
            url 
        });
    } catch (error) {
        console.error('Download URL generation error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to generate download URL' 
        });
    }
});

// Route to stream the file directly
router.get('/download/:key', async (req, res) => {
    try {
        const key = decodeURIComponent(req.params.key);
        const file = await storage.streamDownload(key);

        // Set headers for file download
        res.setHeader('Content-Type', file.contentType);
        res.setHeader('Content-Length', file.contentLength);
        res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);

        // Stream the file to the response
        file.stream.pipe(res).on('error', (error) => {
            console.error('Streaming error:', error);
            // Only send error if headers haven't been sent
            if (!res.headersSent) {
                res.status(500).json({ 
                    success: false,
                    error: 'Failed to stream file' 
                });
            }
        });

    } catch (error) {
        console.error('Download error:', error);
        if (error.message === 'File not found') {
            res.status(404).json({ 
                success: false,
                error: 'File not found' 
            });
        } else {
            res.status(500).json({ 
                success: false,
                error: 'Failed to download file' 
            });
        }
    }
});

module.exports = router;
