class VideoUploader {
    constructor() {
        this.uploadBtn = document.getElementById('uploadBtn');
        this.fileInput = document.getElementById('video');
        this.validationMessage = document.getElementById('videoValidationMessage');
        this.progressBar = document.getElementById('uploadProgress');
        this.videoPreview = document.getElementById('videoPreview');
        this.videoInfo = document.getElementById('videoInfo');
        this.controlButtons = document.getElementById('controlButtons');
        this.cancelBtn = document.getElementById('cancelBtn');
        this.confirmBtn = document.getElementById('confirmBtn');
        this.statusMessage = document.getElementById('statusMessage');
        
        this.currentFile = null;
        this.currentKey = null;
        this.maxDuration = window.MAX_DURATION;
        this.maxDurationFormatted = this.formatTime(this.maxDuration);
        this.fileInputClickHandler = () => this.fileInput.click();
        this.setupEventListeners();
        console.log('VideoUploader initialized with max duration:', this.maxDurationFormatted);
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    setupEventListeners() {
        this.uploadBtn.addEventListener('click', this.fileInputClickHandler);
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.cancelBtn.addEventListener('click', () => this.resetUpload());
        this.confirmBtn.addEventListener('click', () => this.uploadVideo(this.currentFile));
        this.uploadBtn.textContent = `Select Video (Max ${this.maxDurationFormatted})`;
    }

    async handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) {
            console.log('No file selected');
            return;
        }

        console.log('File selected:', {
            name: file.name,
            type: file.type,
            size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`
        });

        if (!this.validateFileType(file)) {
            this.showError('Invalid file type. Please upload a video file.');
            return;
        }

        // Show loading state
        this.uploadBtn.disabled = true;
        this.uploadBtn.textContent = 'Checking video...';

        try {
            const duration = await this.validateDuration(file);
            if (duration > this.maxDuration) {
                throw new Error(`Video duration (${Math.round(duration)}s) exceeds maximum allowed (${this.maxDuration}s)`);
            }
            this.currentFile = file;
            this.showPreview(file, duration);
        } catch (error) {
            console.error('Video validation error:', error);
            this.showError(error.message);
        } finally {
            // Reset button state
            this.uploadBtn.disabled = false;
            this.uploadBtn.textContent = `Select Video (Max ${this.maxDurationFormatted})`;
        }
    }

    validateFileType(file) {
        const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/3gpp', 'video/webm'];
        return validTypes.includes(file.type);
    }

    validateDuration(file) {
        console.log('Validating video duration...');
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.preload = 'metadata';

            video.onerror = () => {
                window.URL.revokeObjectURL(video.src);
                reject(new Error('Error loading video file'));
            };

            video.onloadedmetadata = () => {
                window.URL.revokeObjectURL(video.src);
                console.log('Video metadata loaded, duration:', this.formatTime(video.duration));
                
                if (video.duration > this.maxDuration) {
                    // Show error immediately, do not show preview
                    this.showError(`Video duration (${this.formatTime(video.duration)}) exceeds maximum allowed (${this.maxDurationFormatted})`);
                    reject(new Error(`Video exceeds maximum duration of ${this.maxDurationFormatted}.`));
                } else {
                    resolve(video.duration);
                }
            };

            video.src = URL.createObjectURL(file);
        });
    }

    showPreview(file, duration) {
        // Hide placeholder, show actual video
        document.getElementById('videoPlaceholder').style.display = 'none';
        
        // Update video preview
        const videoUrl = URL.createObjectURL(file);
        this.videoPreview.src = videoUrl;
        this.videoPreview.style.display = 'block';

        // Update info display
        this.videoInfo.innerHTML = `
            File: ${file.name}<br>
            Size: ${(file.size / (1024 * 1024)).toFixed(2)} MB<br>
            Duration: ${this.formatTime(duration)}
        `;
        this.videoInfo.style.display = 'block';

        // Show controls, hide upload button
        this.controlButtons.style.display = 'flex';
        this.uploadBtn.classList.add('hidden');
        this.validationMessage.style.display = 'none';
        this.validationMessage.textContent = '';
    }

    async resetUpload() {
        if (this.currentKey) {
            try {
                const response = await fetch(`/embed/upload/${encodeURIComponent(this.currentKey)}`, {
                    method: 'DELETE'
                });
                const result = await response.json();
                
                if (result.success) {
                    this.showStatus('Previous file deleted. Select a new video to upload.');
                }
            } catch (error) {
                console.error('Failed to delete file:', error);
                this.showError('Failed to delete previous file');
                return;
            }
        }

        // Reset file input
        this.fileInput.value = '';
        this.currentFile = null;
        this.currentKey = null;

        // Show placeholder, hide actual video
        document.getElementById('videoPlaceholder').style.display = 'flex';
        this.videoPreview.style.display = 'none';
        this.videoPreview.src = '';

        // Reset UI
        this.uploadBtn.classList.remove('reupload-btn');
        this.uploadBtn.classList.remove('cancel-upload-btn');
        this.uploadBtn.classList.add('upload-btn');
        this.uploadBtn.textContent = `Select Video (Max ${this.maxDurationFormatted})`;
        this.videoPreview.src = '';
        this.videoPreview.style.display = 'none';
        this.videoInfo.style.display = 'none';
        this.controlButtons.style.display = 'none';
        this.uploadBtn.classList.remove('hidden');
        this.progressBar.style.display = 'none';
        this.validationMessage.textContent = '';
        this.progressBar.value = 0;

        // Don't clear status message immediately if it's showing
        setTimeout(() => {
            if (this.statusMessage.style.display === 'block') {
                this.statusMessage.style.display = 'none';
                this.statusMessage.textContent = '';
            }
        }, 5000);

        this.notifyParent({
            type: 'cancelled'
        });
    }

    showStatus(message, persistent = false) {
        console.log('Showing status message:', message);
        this.statusMessage.textContent = message;
        this.statusMessage.style.display = 'block';
        
        if (message === 'Upload completed successfully!') {
            this.statusMessage.classList.add('success');
        } else {
            this.statusMessage.classList.remove('success');
        }
        
        // Clear any existing timeout
        if (this._statusTimeout) {
            clearTimeout(this._statusTimeout);
        }
        
        if (persistent) {
            // Skip auto-hide for persistent messages
            return;
        }

        // Set new timeout for auto-hide
        this._statusTimeout = setTimeout(() => {
            if (this.statusMessage.textContent === message) {
                this.statusMessage.style.display = 'none';
                this.statusMessage.textContent = '';
            }
        }, 5000);
    }

    async uploadVideo(file) {
        if (!file) {
            console.warn('Upload attempted without file');
            return;
        }

        console.log('Starting upload process:', {
            filename: file.name,
            size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
            type: file.type
        });
        this.showStatus('Upload initiated, please wait...');

        const formData = new FormData();
        formData.append('video', file);

        this.progressBar.style.display = 'block';
        this.progressBar.value = 0;
        this.confirmBtn.disabled = true;
        this.cancelBtn.disabled = true;

        console.log('Starting upload for file:', {
            name: file.name,
            size: file.size,
            type: file.type
        });

        try {
            console.log('Sending upload request...');
            const response = await fetch('/embed/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const result = await response.json();
            console.log('Upload result:', result);
            
            if (result.success) {
                this.currentKey = result.key;
                return await this.monitorUploadProgress(result.uploadId);
            } else {
                throw new Error(result.error || 'Upload failed');
            }
        } catch (error) {
            console.error('Upload error:', error);
            this.showError(`Upload failed: ${error.message}`);
        } finally {
            this.confirmBtn.disabled = false;
            this.cancelBtn.disabled = false;
        }
    }

    async monitorUploadProgress(uploadId, retryCount = 0) {
        const MAX_RETRIES = 3;
        const RETRY_DELAY = 1000;
        
        return new Promise((resolve, reject) => {
            let eventSource;
            let progressTimeout;
            let lastProgressTime = Date.now();
            const PROGRESS_TIMEOUT = 10000; // 10 seconds

            const cleanup = () => {
                if (eventSource) {
                    eventSource.close();
                }
                if (progressTimeout) {
                    clearTimeout(progressTimeout);
                }
            };

            const setupProgressMonitoring = () => {
                const eventSourceUrl = `/embed/upload/progress/${uploadId}`;
                console.log('Creating EventSource connection:', eventSourceUrl);
                
                eventSource = new EventSource(eventSourceUrl);
                let hasReceivedProgress = false;

                eventSource.onopen = () => {
                    console.log('SSE Connection opened');
                    hasReceivedProgress = false;
                    lastProgressTime = Date.now();
                };

                eventSource.onmessage = (event) => {
                    try {
                        const progress = JSON.parse(event.data);
                        console.log('Progress event received:', progress);
                        hasReceivedProgress = true;
                        lastProgressTime = Date.now();
                        
                        this.updateProgress(progress);

                        if (progress.phase === 'uploading' && progress.percentage === 100) {
                            console.log('Upload complete');
                            cleanup();
                            this.showStatus('Upload completed successfully!');
                            this.showCancelState();
                            resolve();
                        }
                    } catch (error) {
                        console.error('Error parsing progress:', error);
                        handleError(error);
                    }
                };

                eventSource.onerror = (error) => {
                    console.error('EventSource error:', error);
                    handleError(new Error('Connection lost'));
                };

                // Set up progress timeout checker
                progressTimeout = setInterval(() => {
                    const timeSinceLastProgress = Date.now() - lastProgressTime;
                    if (timeSinceLastProgress > PROGRESS_TIMEOUT) {
                        console.warn('Progress timeout reached');
                        handleError(new Error('Progress timeout'));
                    }
                }, 1000);
            };

            const handleError = async (error) => {
                cleanup();
                
                if (retryCount < MAX_RETRIES) {
                    console.log(`Retrying connection (${retryCount + 1}/${MAX_RETRIES})...`);
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                    this.monitorUploadProgress(uploadId, retryCount + 1)
                        .then(resolve)
                        .catch(reject);
                } else {
                    console.error('Max retries reached');
                    this.showError('Upload failed: Connection lost');
                    reject(error);
                }
            };

            setupProgressMonitoring();
        });
    }

    updateProgress(progress) {
        if (progress.phase === 'processing') {
            // this.progressBar.value = progress.percentage / 2;
            // this.showStatus(`Processing: ${progress.percentage}%`);
        } else if (progress.phase === 'uploading') {
            const totalProgress = (progress.percentage);
            this.progressBar.value = totalProgress;
            this.showStatus(`Uploading: ${progress.percentage}%`);
        }
    }

    handleEventSourceError(eventSource, reject, message) {
        console.error('EventSource error:', message);
        eventSource.close();
        this.showError(message);
        reject(new Error(message));
    }

    showCancelState() {
        // Hide all controls except upload button
        // this.videoPreview.style.display = 'none';
        // this.videoInfo.style.display = 'none';
        this.controlButtons.style.display = 'none';
        this.progressBar.style.display = 'none';
        
        // Show placeholder
        // document.getElementById('videoPlaceholder').style.display = 'flex';
        
        // Show persistent message
        this.showStatus('Upload completed successfully!', true);

        // Update upload button to be a cancel button
        this.uploadBtn.classList.remove('hidden');
        this.uploadBtn.textContent = 'Start Over';
        this.uploadBtn.classList.remove('reupload-btn');
        this.uploadBtn.classList.add('cancel-upload-btn');

        // Remove original file dialog trigger
        this.uploadBtn.removeEventListener('click', this.fileInputClickHandler);

        // Make the “Start Over” button not open file dialog
        this.uploadBtn.onclick = () => {
            // Reset everything, let user manually click “Select Video” later if desired
            this.resetUpload();
            this.uploadBtn.addEventListener('click', this.fileInputClickHandler);
            this.uploadBtn.textContent = `Select Video (Max ${this.maxDurationFormatted})`;
        };
    }

    showError(message) {
        console.error(message);
        this.validationMessage.textContent = message;
        this.validationMessage.style.display = 'block';
        this.statusMessage.style.display = 'none';
        
        // Reset the file input
        this.fileInput.value = '';
        this.currentFile = null;
        
        // Ensure upload button is visible and enabled
        this.uploadBtn.classList.remove('hidden');
        this.uploadBtn.disabled = false;
        
        // Show placeholder, hide actual video
        document.getElementById('videoPlaceholder').style.display = 'flex';
        this.videoPreview.style.display = 'none';
        
        // Hide preview elements
        this.videoPreview.style.display = 'none';
        this.videoInfo.style.display = 'none';
        this.controlButtons.style.display = 'none';
        
        this.notifyParent({ error: message });
    }

    notifyParent(data) {
        if (window.parent) {
            window.parent.postMessage({
                type: 'videoUpload',
                data: data
            }, '*');
        }
    }
}

// Initialize the uploader
new VideoUploader();
