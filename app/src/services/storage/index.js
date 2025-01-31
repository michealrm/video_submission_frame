const S3Adapter = require('./S3Adapter');
const LocalAdapter = require('./LocalAdapter');
const EventEmitter = require('events');
const { storageConfig } = require('../../config/storage');

class StorageService extends EventEmitter {
    constructor(config = {}) {
        super();
        this.config = { ...storageConfig, ...config };
        this.adapter = this.createAdapter();
        
        // Forward adapter events to storage service
        if (this.adapter instanceof EventEmitter) {
            this.adapter.on('progress', (progress) => {
                this.emit('progress', progress);
            });
        }

        console.log('StorageService initialized:', {
            type: this.config.type,
            maxFileSize: this.config.maxFileSize,
            maxDuration: this.config.maxDuration
        });
    }

    createAdapter() {
        const type = this.config.type || 's3';
        console.log(`Initializing storage adapter: ${type}`);
        
        switch (type) {
            case 's3':
                return new S3Adapter(this.config);
            case 'local':
                return new LocalAdapter(this.config);
            default:
                console.warn(`Unknown storage type: ${type}, falling back to S3`);
                return new S3Adapter(this.config);
        }
    }

    async saveFile(file, fileName, uploadId) {
        if (!file) throw new Error('No file provided');

        console.log('StorageService saving file:', {
            originalName: file.originalname,
            size: file.size,
            mimeType: file.mimetype,
            uploadId
        });

        
        try {
            const result = await this.adapter.uploadFile(file, fileName, uploadId);
            console.log('File saved successfully:', result);
            return result;
        } catch (error) {
            console.error('Failed to save file:', error);
            throw error;
        }
    }

    async getFile(key) {
        if (!key) throw new Error('No file key provided');
        return await this.adapter.getFile(key);
    }

    async deleteFile(fileName) {
        return await this.adapter.deleteFile(fileName);
    }
}

const createStorage = (config) => {
    return new StorageService(config);
};

module.exports = {
    StorageService,
    createStorage
};