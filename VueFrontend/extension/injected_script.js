// injected_script.js - Injected into page context to provide MediaSoupTabRecorder API

(function() {
    'use strict';

    // Check if already injected
    if (window.MediaSoupTabRecorder) {
        console.log('MediaSoupTabRecorder already exists');
        return;
    }

    class MediaSoupTabRecorder {
        constructor() {
            this.isAvailable = true;
            this.isRecording = false;
            this.requestId = 0;
            this.pendingRequests = new Map();
            
            // Event callbacks (will be set by frontend)
            this.onRecordingStarted = null;
            this.onRecordingStopped = null;
            this.onUploadSuccess = null;
            this.onUploadFailed = null;
            this.onError = null;

            // Set up message listeners
            this.setupMessageListeners();
        }

        // Set up message listeners for communication with content script
        setupMessageListeners() {
            window.addEventListener('message', (event) => {
                if (event.source !== window) return;

                if (event.data.type === 'FROM_CONTENT_SCRIPT') {
                    this.handleContentScriptMessage(event.data);
                } else if (event.data.type === 'FROM_BACKGROUND') {
                    this.handleBackgroundMessage(event.data);
                }
            });
        }

        // Handle messages from content script (responses to API calls)
        handleContentScriptMessage(data) {
            const { action, response, error, requestId } = data;

            if (requestId && this.pendingRequests.has(requestId)) {
                const { resolve, reject } = this.pendingRequests.get(requestId);
                this.pendingRequests.delete(requestId);

                if (error) {
                    reject(new Error(error));
                } else {
                    resolve(response);
                }
            }
        }

        // Handle messages from background script (events)
        handleBackgroundMessage(data) {
            const { action, data: eventData } = data;

            switch (action) {
                case 'recordingStarted':
                    this.isRecording = true;
                    if (this.onRecordingStarted) {
                        this.onRecordingStarted(eventData);
                    }
                    break;

                case 'recordingStopped':
                    this.isRecording = false;
                    if (this.onRecordingStopped) {
                        this.onRecordingStopped(eventData);
                    }
                    break;

                case 'uploadSuccess':
                    if (this.onUploadSuccess) {
                        this.onUploadSuccess(eventData);
                    }
                    break;

                case 'uploadFailed':
                    if (this.onUploadFailed) {
                        this.onUploadFailed(eventData);
                    }
                    break;

                case 'error':
                    if (this.onError) {
                        this.onError(eventData);
                    }
                    break;
            }
        }

        // Send message to content script and return promise
        sendMessage(action, data = null) {
            return new Promise((resolve, reject) => {
                const requestId = ++this.requestId;
                this.pendingRequests.set(requestId, { resolve, reject });

                // Set timeout for request
                setTimeout(() => {
                    if (this.pendingRequests.has(requestId)) {
                        this.pendingRequests.delete(requestId);
                        reject(new Error('Request timeout'));
                    }
                }, 10000);

                // Send message to content script
                window.postMessage({
                    type: 'FROM_PAGE',
                    action: action,
                    data: data,
                    requestId: requestId
                }, '*');
            });
        }

        // Start recording
        async startRecording(config = {}) {
            try {
                if (this.isRecording) {
                    throw new Error('Recording is already in progress');
                }

                const result = await this.sendMessage('startRecording', config);

                if (result && result.success) {
                    this.isRecording = true;
                    return {
                        success: true,
                        mimeType: result.mimeType || 'video/webm',
                        message: result.message || '录制开始成功'
                    };
                } else {
                    throw new Error(result.message || 'Failed to start recording');
                }

            } catch (error) {
                console.error('Error starting recording:', error);
                
                // Handle specific error types
                if (error.message.includes('permission')) {
                    throw new Error('activeTab permission required');
                } else if (error.message.includes('gesture')) {
                    throw new Error('NEED_USER_GESTURE');
                } else if (error.message.includes('available')) {
                    throw new Error('Extension not available');
                }
                
                throw error;
            }
        }

        // Stop recording
        async stopRecording() {
            try {
                if (!this.isRecording) {
                    throw new Error('No recording in progress');
                }

                const result = await this.sendMessage('stopRecording');

                if (result && result.success) {
                    this.isRecording = false;
                    return {
                        success: true,
                        duration: result.duration || 0,
                        message: result.message || '录制停止成功',
                        fileSize: result.fileSize,
                        downloadUrl: result.downloadUrl
                    };
                } else {
                    throw new Error(result.message || 'Failed to stop recording');
                }

            } catch (error) {
                console.error('Error stopping recording:', error);
                this.isRecording = false;
                
                if (error.message.includes('abort')) {
                    throw new Error('ABORT_ERROR');
                }
                
                throw error;
            }
        }

        // Get recording status
        async getRecordingStatus() {
            try {
                const result = await this.sendMessage('getRecordingStatus');

                if (result && result.success && result.data) {
                    return {
                        isRecording: result.data.isRecording,
                        duration: result.data.duration || 0
                    };
                } else {
                    return {
                        isRecording: this.isRecording,
                        duration: 0
                    };
                }

            } catch (error) {
                console.error('Error getting recording status:', error);
                return {
                    isRecording: this.isRecording,
                    duration: 0
                };
            }
        }

        // Wait for extension to be ready
        async waitForReady(timeout = 5000) {
            return new Promise((resolve) => {
                // Extension is ready immediately since it's injected
                setTimeout(() => resolve(this.isAvailable), 100);
            });
        }

        // Upload recording (optional method)
        async uploadRecording(uploadConfig = {}) {
            try {
                const result = await this.sendMessage('uploadRecording', uploadConfig);

                if (result && result.success) {
                    return result;
                } else {
                    throw new Error(result.message || 'Upload failed');
                }

            } catch (error) {
                console.error('Error uploading recording:', error);
                throw error;
            }
        }
    }

    // Create and expose the global API
    window.MediaSoupTabRecorder = new MediaSoupTabRecorder();

    // Log that the API is ready
    console.log('MediaSoupTabRecorder API injected and ready');

    // Dispatch a custom event to notify that the API is ready
    window.dispatchEvent(new CustomEvent('MediaSoupTabRecorderReady', {
        detail: { api: window.MediaSoupTabRecorder }
    }));

})();

