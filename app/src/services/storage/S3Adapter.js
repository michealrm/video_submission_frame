const { s3Client } = require('../../config/storage');
const { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

class S3Adapter {
    constructor(config) {
        this.client = s3Client;
        this.bucket = config.s3.bucket;
        console.log('S3Adapter initialized with bucket:', this.bucket);
    }

    async generateUploadUrl(key, contentType, expiresIn = 3600) {
        const putCommand = new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            ContentType: contentType
        });

        const signedUrl = await getSignedUrl(this.client, putCommand, { expiresIn });
        return {
            url: signedUrl,
            key,
            bucket: this.bucket
        };
    }

    async getDownloadUrl(key, expiresIn = 3600) {
        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: key
        });

        return await getSignedUrl(this.client, command, { expiresIn });
    }

    async streamObject(key) {
        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: key
        });

        try {
            const response = await this.client.send(command);
            return {
                stream: response.Body,
                contentType: response.ContentType,
                contentLength: response.ContentLength,
                filename: key.split('/').pop() // Extract filename from key
            };
        } catch (error) {
            if (error.name === 'NoSuchKey') {
                throw new Error('File not found');
            }
            throw new Error(`Failed to get file: ${error.message}`);
        }
    }

    async getFile(key) {
        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: key
        });

        try {
            const response = await this.client.send(command);
            // Convert stream to buffer for easier handling
            const chunks = [];
            for await (const chunk of response.Body) {
                chunks.push(chunk);
            }
            
            return {
                data: Buffer.concat(chunks),
                contentType: response.ContentType,
                contentLength: response.ContentLength,
                filename: key.split('/').pop() // Extract filename from key
            };
        } catch (error) {
            if (error.name === 'NoSuchKey') {
                throw new Error('File not found');
            }
            throw new Error(`Failed to get file: ${error.message}`);
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

    getFileUrl(key) {
        const endpoint = this.client.config.endpoint || '';
        const cleanEndpoint = typeof endpoint === 'string' ? endpoint.replace(/\/+$/, '') : '';
        return `${cleanEndpoint}/${this.bucket}/${key}`;
    }
}

module.exports = S3Adapter;
