const { s3Client } = require('../../config/storage');
const { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const fs = require('fs').promises;
const { Readable } = require('stream');
const EventEmitter = require('events');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

class S3Adapter extends EventEmitter {
    constructor(config) {
        super();
        this.client = s3Client; // Use the imported s3Client directly
        this.bucket = config.s3.bucket;
        console.log('S3Adapter initialized with bucket:', this.bucket);
    }

    async uploadFile(file, key, uploadId) {
        console.log('S3Adapter starting upload:', { key, uploadId });
        try {
            const fileData = await this.processFileToBuffer(file, uploadId);  // Pass uploadId here
            return await this.uploadBuffer(fileData.buffer, key, fileData.mimetype, uploadId);
        } catch (error) {
            console.error('S3 upload failed:', error);
            throw new Error(`Failed to upload file: ${error.message}`);
        }
    }

    async processFileToBuffer(file, uploadId) {  // Add uploadId parameter
        console.log('Processing file to buffer:', {
            fileType: file.mimetype,
            fileSize: file.size,
            sourcePath: file.path
        });

        console.log('Processing file:', {
            type: typeof file,
            isBuffer: Buffer.isBuffer(file),
            hasBuffer: !!file.buffer,
            isReadable: file instanceof Readable,
            fileKeys: Object.keys(file)
        });

        let buffer;
        let mimetype = 'application/octet-stream';
        let processedBytes = 0;
        const totalBytes = file.size;

        if (file.path) {
            const stream = require('fs').createReadStream(file.path);
            buffer = await this.streamToBuffer(stream, (chunk) => {
                processedBytes += chunk.length;
                this.emit('progress', {
                    uploadId,
                    phase: 'processing',
                    processed: processedBytes,
                    total: totalBytes,
                    percentage: Math.round((processedBytes / totalBytes) * 100)
                });
            });
            mimetype = file.mimetype;
        } else if (file.buffer) {
            buffer = file.buffer;
            mimetype = file.mimetype;
        } else if (Buffer.isBuffer(file)) {
            buffer = file;
        } else if (file instanceof Readable) {
            buffer = await this.streamToBuffer(file);
        } else {
            throw new Error('No valid file content found');
        }

        console.log('File processing complete:', {
            bufferSize: buffer.length,
            mimeType: mimetype
        });

        return { buffer, mimetype };
    }

    async uploadBuffer(buffer, key, contentType, uploadId) {
        console.log('Starting multipart upload:', { key, uploadId, size: buffer.length });
        
        // Emit initial progress
        this.emit('progress', {
            uploadId,
            phase: 'uploading',
            processed: 0,
            total: buffer.length,
            percentage: 0
        });

        const upload = new Upload({
            client: this.client,
            params: {
                Bucket: this.bucket,
                Key: key,
                Body: buffer,
                ContentType: contentType
            },
            partSize: 5 * 1024 * 1024, // 5 MB chunks
            queueSize: 1 // upload one chunk at a time
        });

        let lastPercentage = 0;

        upload.on('httpUploadProgress', (progress) => {
            const loaded = progress.loaded || 0;
            const percentage = Math.round((loaded / buffer.length) * 100);
            
            // Only emit if percentage has changed
            if (percentage !== lastPercentage) {
                console.log('Upload progress:', {
                    loaded,
                    total: buffer.length,
                    percentage,
                    uploadId
                });

                this.emit('progress', {
                    uploadId,
                    phase: 'uploading',
                    processed: loaded,
                    total: buffer.length,
                    percentage
                });

                lastPercentage = percentage;
            }
        });

        try {
            const result = await upload.done();
            
            // Always emit 100% progress at completion
            this.emit('progress', {
                uploadId,
                phase: 'uploading',
                processed: buffer.length,
                total: buffer.length,
                percentage: 100
            });

            const fileUrl = this.getFileUrl(key);
            return { url: fileUrl, key, etag: result.ETag };
        } catch (error) {
            console.error('Upload failed:', error);
            throw error;
        }
    }

    async deleteFile(key) {
        try {
            const command = new DeleteObjectCommand({
                Bucket: this.bucket,
                Key: key
            });
            await this.client.send(command);
            return true;
        } catch (error) {
            throw new Error(`Failed to delete file: ${error.message}`);
        }
    }

    async getFile(key) {
        try {
            const command = new GetObjectCommand({
                Bucket: this.bucket,
                Key: key
            });

            const response = await this.client.send(command);
            
            // Convert stream to buffer
            const chunks = [];
            for await (const chunk of response.Body) {
                chunks.push(chunk);
            }
            
            return {
                data: Buffer.concat(chunks),
                contentType: response.ContentType,
                contentLength: response.ContentLength,
                key: key
            };
        } catch (error) {
            if (error.name === 'NoSuchKey') {
                throw new Error('File not found');
            }
            throw new Error(`Failed to get file: ${error.message}`);
        }
    }

    async streamToBuffer(stream, onProgress) {
        const chunks = [];
        return new Promise((resolve, reject) => {
            stream.on('data', chunk => {
                chunks.push(chunk);
                if (onProgress) onProgress(chunk);
            });
            stream.on('error', reject);
            stream.on('end', () => resolve(Buffer.concat(chunks)));
        });
    }

    getFileUrl(key) {
        const endpoint = this.client.config.endpoint || '';
        // Remove any trailing slashes from endpoint
        const cleanEndpoint = typeof endpoint === 'string' ? endpoint.replace(/\/+$/, '') : '';
        return `${cleanEndpoint}/${this.bucket}/${key}`;
    }
}

module.exports = S3Adapter;
