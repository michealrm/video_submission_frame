const express = require('express');
const multer = require('multer');
const { getVideoDurationInSeconds } = require('get-video-duration');
const { createStorage } = require('../services/storage');
const storageConfig = require('../config/storage').storageConfig;
const fs = require('fs').promises;
const router = express.Router();

const storage = createStorage(storageConfig);

const upload = multer({ 
    storage: multer.diskStorage({
        filename: (_, file, cb) => {
            cb(null, Date.now() + '-' + file.originalname);
        }
    }),
    fileFilter: (req, file, cb) => {
        if (storageConfig.allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid video format'));
        }
    },
    limits: {
        fileSize: storageConfig.maxFileSize
    }
});

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

router.get('/upload/progress/:id', (req, res) => {
    const requestedId = req.params.id;
    console.log('Progress connection requested for ID:', requestedId);

    // Disable compression and buffering
    if (res.compress) res.compress = false;
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Send initial connection event
    const writeEvent = (data) => {
        const event = `data: ${JSON.stringify(data)}\n\n`;
        console.log('Writing SSE event:', event);
        res.write(event);
        res.flush?.();
    };

    writeEvent({ phase: 'connected', percentage: 0 });

    const progressHandler = (progress) => {
        console.log('Progress event received:', { requestedId, progress });
        
        if (progress.uploadId === requestedId) {
            try {
                writeEvent(progress);
                if (progress.phase === 'uploading' && progress.percentage === 100) {
                    cleanup();
                }
            } catch (error) {
                console.error('Error sending progress:', error);
                cleanup();
            }
        }
    };

    const cleanup = () => {
        storage.removeListener('progress', progressHandler);
        console.log('Cleaned up progress handler for ID:', requestedId);
    };

    storage.on('progress', progressHandler);
    req.on('close', cleanup);
    req.on('error', cleanup);
});

router.post('/upload', upload.single('video'), async (req, res) => {
    console.log('Using storage type:', storage.config.type);
    console.log('Upload request received:', {
        headers: req.headers,
        file: req.file ? {
            filename: req.file.filename,
            mimetype: req.file.mimetype,
            size: `${(req.file.size / (1024 * 1024)).toFixed(2)} MB`
        } : 'No file'
    });

    res.header('Access-Control-Allow-Origin', '*');
    
    try {
        console.log('Processing upload request...');
        if (!req.file) {
            console.error('No file uploaded');
            return res.status(400).json({ error: 'No video file uploaded' });
        }

        console.log('Checking video duration...');
        const duration = await getVideoDurationInSeconds(req.file.path);
        console.log('Video duration:', duration);
        
        if (duration > storageConfig.maxDuration) {
            await fs.unlink(req.file.path);
            return res.status(400).json({
                error: `Video duration (${formatTime(duration)}) exceeds maximum allowed (${formatTime(storageConfig.maxDuration)})`
            });
        }

        console.log('Video validation passed, duration:', formatTime(duration));
        const uploadId = Date.now().toString();
        console.log('Starting upload with ID:', uploadId);

        // Send initial response right away
        res.json({ 
            uploadId,
            success: true,
            file: req.file.filename
        });

        try {
            // Start actual upload after response sent
            const result = await storage.saveFile(req.file, uploadId);
            console.log('Upload complete:', { uploadId, ...result });
        } catch (error) {
            console.error('Upload failed:', error);
            // Cleanup on error
            if (req.file) {
                await fs.unlink(req.file.path).catch(console.error);
            }
        }

        // Clean up temporary file
        await fs.unlink(req.file.path);

    } catch (error) {
        console.error('Upload processing failed:', {
            error: error.message,
            stack: error.stack
        });
        if (req.file) {
            await fs.unlink(req.file.path).catch(err => {
                console.error('Error deleting temp file:', err);
            });
        }
        res.status(500).json({ 
            error: 'Error processing video',
            details: error.message 
        });
    }
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

module.exports = router;
