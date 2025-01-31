const path = require('path');
const { S3Client } = require('@aws-sdk/client-s3');
const { NodeHttpHandler } = require("@aws-sdk/node-http-handler");

const storageConfig = {
    // Default storage type
    type: process.env.STORAGE_TYPE || 'local',
    maxDuration: parseInt(process.env.STORAGE_MAX_DURATION || '180', 10),
    allowedMimes: ['video/mp4', 'video/quicktime', 'video/webm'],

    // Local storage configuration
    local: {
        uploadDir: path.join(process.cwd(), 'uploads'),
        maxFileSize: 100 * 1024 * 1024, // 100MB
        allowedTypes: ['video/mp4', 'video/quicktime', 'video/webm'],
        maxDuration: 300, // 5 minutes in seconds
        naming: {
            strategy: 'timestamp',
            prefix: '',
            suffix: ''
        }
    },

    // S3 storage configuration
    s3: {
        bucket: process.env.STORAGE_BUCKET || 'video-uploads',
        region: process.env.STORAGE_REGION || 'us-east-1',
        accessKeyId: process.env.STORAGE_ACCESS_KEY,
        secretAccessKey: process.env.STORAGE_SECRET_KEY,
        endpoint: process.env.STORAGE_ENDPOINT || 'http://localhost:9000',
        forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE === 'true',
        maxFileSize: 100 * 1024 * 1024,
        allowedTypes: ['video/mp4', 'video/quicktime', 'video/webm']
    },

    // Validation helpers
    isValidFileType(mimetype) {
        return this[this.type].allowedTypes.includes(mimetype);
    },

    isValidFileSize(size) {
        return size <= this[this.type].maxFileSize;
    }
};

// Initialize S3 client
const s3Client = new S3Client({
    credentials: {
        accessKeyId: storageConfig.s3.accessKeyId,
        secretAccessKey: storageConfig.s3.secretAccessKey
    },
    endpoint: storageConfig.s3.endpoint,
    region: storageConfig.s3.region,
    forcePathStyle: true,
    requestHandler: new NodeHttpHandler({
        connectionTimeout: 5000,
        socketTimeout: 5000
    }),
    maxAttempts: 3,
    retryMode: 'standard'
});

module.exports = {
    storageConfig,
    s3Client
};