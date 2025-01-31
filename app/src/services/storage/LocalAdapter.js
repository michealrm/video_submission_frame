const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');
const mime = require('mime-types');

class LocalAdapter extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.uploadDir = config.local.uploadDir;
        this.ensureUploadDir();
    }

    async ensureUploadDir() {
        try {
            await fs.access(this.uploadDir);
        } catch (error) {
            await fs.mkdir(this.uploadDir, { recursive: true });
        }
    }

    async uploadFile(file, key) {
        const filePath = path.join(this.uploadDir, key);
        
        try {
            if (file.path) {
                // If file is already on disk, move it
                await fs.copyFile(file.path, filePath);
            } else {
                // If file is in memory, write it
                await fs.writeFile(filePath, file.buffer || file);
            }

            return {
                url: `/uploads/${key}`,
                key: key
            };
        } catch (error) {
            throw new Error(`Failed to save file locally: ${error.message}`);
        }
    }

    async getFile(key) {
        try {
            const filePath = path.join(this.uploadDir, key);
            const data = await fs.readFile(filePath);
            const stats = await fs.stat(filePath);
            
            return {
                data: data,
                contentType: mime.lookup(filePath) || 'application/octet-stream',
                contentLength: stats.size,
                key: key
            };
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error('File not found');
            }
            throw new Error(`Failed to get file: ${error.message}`);
        }
    }

    async deleteFile(key) {
        try {
            const filePath = path.join(this.uploadDir, key);
            await fs.unlink(filePath);
            return true;
        } catch (error) {
            throw new Error(`Failed to delete file: ${error.message}`);
        }
    }
}

module.exports = LocalAdapter;
