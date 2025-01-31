const S3Adapter = require('./S3Adapter');
const { storageConfig } = require('../../config/storage');

class StorageService {
    constructor(config = {}) {
        this.config = { ...storageConfig, ...config };
        this.adapter = new S3Adapter(this.config);

        console.log('StorageService initialized:', {
            type: this.config.type,
            maxFileSize: this.config.maxFileSize,
            maxDuration: this.config.maxDuration
        });
    }

    async generateUploadUrl(fileName, contentType) {
        const key = `${Date.now()}-${fileName}`;
        return await this.adapter.generateUploadUrl(key, contentType);
    }

    async deleteFile(fileName) {
        return await this.adapter.deleteFile(fileName);
    }

    async getDownloadUrl(key) {
        return await this.adapter.getDownloadUrl(key);
    }

    async streamDownload(key) {
        return await this.adapter.streamObject(key);
    }

    async getFile(key) {
        return await this.adapter.getFile(key);
    }
}

const createStorage = (config) => {
    return new StorageService(config);
};

module.exports = {
    StorageService,
    createStorage
};