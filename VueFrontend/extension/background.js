// background.js - Service worker for managing offscreen document and handling messages

class TabRecorderManager {
    constructor() {
        this.isRecording = false;
        this.lastRecordedBlob = null;
        this.currentTabId = null;
        this.offscreenDocumentCreated = false;
        this.recordingStartTime = null;
    }

    // Ensure offscreen document is created
    async ensureOffscreenDocument() {
        if (this.offscreenDocumentCreated) {
            return;
        }

        try {
            // Check if offscreen document already exists
            const existingContexts = await chrome.runtime.getContexts({
                contextTypes: ['OFFSCREEN_DOCUMENT']
            });

            if (existingContexts.length > 0) {
                this.offscreenDocumentCreated = true;
                console.log('Offscreen document already exists');
                return;
            }

            // Create offscreen document
            await chrome.offscreen.createDocument({
                url: 'offscreen.html',
                reasons: [chrome.offscreen.Reason.USER_MEDIA],
                justification: 'Record tab audio and video using tabCapture API'
            });

            this.offscreenDocumentCreated = true;
            console.log('Offscreen document created');

        } catch (error) {
            console.error('Error creating offscreen document:', error);
            throw new Error('Failed to create offscreen document: ' + error.message);
        }
    }

    // Start recording by delegating to offscreen document
    async startRecording(config = {}) {
        try {
            if (this.isRecording) {
                throw new Error('Recording is already in progress');
            }

            // Get the current active tab
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tabs.length) {
                throw new Error('No active tab found');
            }

            this.currentTabId = tabs[0].id;

            // Ensure offscreen document is created
            await this.ensureOffscreenDocument();

            // Get stream ID for the current tab
            const streamId = await chrome.tabCapture.getMediaStreamId({
                targetTabId: this.currentTabId
            });

            // Send recording request to offscreen document
            const result = await this.sendMessageToOffscreen({
                type: 'start-recording',
                target: 'offscreen',
                data: {
                    streamId: streamId,
                    config: config
                }
            });

            if (result && result.success) {
                this.isRecording = true;
                this.recordingStartTime = Date.now();

                // Notify content scripts
                this.notifyContentScripts('recordingStarted', result);
            }

            return result;

        } catch (error) {
            console.error('Error starting recording:', error);

            // Handle specific errors
            let errorMessage = error.message;
            if (error.message.includes('permission')) {
                errorMessage = 'activeTab permission required';
            } else if (error.message.includes('gesture')) {
                errorMessage = 'NEED_USER_GESTURE';
            }

            throw new Error(errorMessage);
        }
    }


    // Get recording status
    async getRecordingStatus() {
        try {
            const duration = this.isRecording && this.recordingStartTime ?
                Date.now() - this.recordingStartTime : 0;

            return {
                success: true,
                data: {
                    isRecording: this.isRecording,
                    duration: duration
                }
            };

        } catch (error) {
            console.error('Error getting recording status:', error);
            return {
                success: true,
                data: {
                    isRecording: this.isRecording,
                    duration: 0
                }
            };
        }
    }

    // Send message to offscreen document with timeout
    async sendMessageToOffscreen(message, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error('Offscreen message timeout'));
            }, timeout);

            chrome.runtime.sendMessage(message, (response) => {
                clearTimeout(timeoutId);

                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }

                resolve(response);
            });
        });
    }

    // Notify content scripts of events
    async notifyContentScripts(action, data) {
        try {
            if (this.currentTabId) {
                await chrome.tabs.sendMessage(this.currentTabId, {
                    action: action,
                    data: data
                });
            }
        } catch (error) {
            console.error('Error notifying content script:', error);
        }
    }

    // Stop recording by delegating to offscreen document, now only forwards and syncs status
    async stopRecording({ meetingId }) {
        try {
            if (!this.isRecording) {
                throw new Error('No recording in progress');
            }
            if (!meetingId) {
                throw new Error('meetingId is required to stop recording');
            }

            // Send stop request to offscreen document, let offscreen handle upload
            const result = await this.sendMessageToOffscreen({
                type: 'stop-recording',
                target: 'offscreen',
                data: { meetingId }
            });

            this.isRecording = false;
            // 通知前端录制状态变更
            this.notifyContentScripts('recordingStopped', result);
            return result;
        } catch (error) {
            console.error('Error stopping recording:', error);
            this.isRecording = false;
            throw error;
        }
    }

}

// Create global recorder manager instance
const recorderManager = new TabRecorderManager();

// Handle messages from content scripts and offscreen document
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background received message:', message, 'from:', sender);

    const { action, data, type } = message;

    // 处理 offscreen 主动上传结果
    if (action === 'uploadResult') {
        if (data.success) {
            console.log('录制文件上传成功:', data.result);
            // 可通知前端或做后续处理
            // this.notifyContentScripts('uploadSuccess', data.result);
        } else {
            console.error('录制文件上传失败:', data.error);
            // this.notifyContentScripts('uploadFailed', data.error);
        }
        return;
    }

    // Handle messages from offscreen document
    if (message.from === 'offscreen') {
        // 通知前端
        console.log('Received message from offscreen document:', message);
        switch (action || type) {
            case 'recordingStarted':
                recorderManager.isRecording = true;
                recorderManager.notifyContentScripts('recordingStarted', data);
                break;
            case 'recordingStopped':
                recorderManager.isRecording = false;
                // Handle blob data if present
                if (data && data.blobData && data.blobType) {
                    // recorderManager.handleRecordedBlob(data.blobData, data.blobType);
                }
                recorderManager.notifyContentScripts('recordingStopped', data);
                break;
            case 'recordingError':
                recorderManager.isRecording = false;
                recorderManager.notifyContentScripts('error', data);
                break;
        }
        return;
    }

    // Handle messages from content scripts
    console.log('Background received action from content:', action, 'with data:', data);
    switch (action) {
        case 'startRecording':
            recorderManager.startRecording(data)
                .then(result => sendResponse(result))
                .catch(error => sendResponse({
                    success: false,
                    message: error.message
                }));
            return true; // Keep message channel open for async response

        case 'stopRecording':
            // 现在 offscreen 会直接上传文件，background 只负责转发 stopRecording 请求
            recorderManager.stopRecording(data)
                .then(result => sendResponse(result))
                .catch(error => sendResponse({
                    success: false,
                    message: error.message
                }));
            return true; // Keep message channel open for async response

        case 'getRecordingStatus':
            recorderManager.getRecordingStatus()
                .then(result => sendResponse(result))
                .catch(error => sendResponse({
                    success: false,
                    message: error.message
                }));
            return true; // Keep message channel open for async response

        // 已废弃：background 不再处理文件上传，移除 uploadRecording 相关 case
        // case 'uploadRecording':
        //     recorderManager.uploadRecording(data)
        //         .then(result => sendResponse(result))
        //         .catch(error => sendResponse({
        //             success: false,
        //             message: error.message
        //         }));
        //     return true; // Keep message channel open for async response

        default:
            sendResponse({
                success: false,
                message: 'Unknown action: ' + action
            });
    }
});

// Handle popup button click to start/stop recording
chrome.action.onClicked.addListener(async (tab) => {
    try {
        if (recorderManager.isRecording) {
            // Stop recording
            await recorderManager.stopRecording();
            console.log('Recording stopped via popup');
        } else {
            // Start recording
            await recorderManager.startRecording({
                audio: true,
                video: true,
                audioConstraints: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                videoConstraints: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 }
                },
                preferredMimeTypes: [
                    'video/webm;codecs=vp8,opus',
                    'video/webm;codecs=vp9,opus',
                    'video/webm;codecs=h264,opus',
                    'video/webm'
                ]
            });
            console.log('Recording started via popup');
        }
    } catch (error) {
        console.error('Error handling popup click:', error);
    }
});



// Handle tab updates to clean up if tab is closed during recording
chrome.tabs.onRemoved.addListener((tabId) => {
    if (recorderManager.currentTabId === tabId && recorderManager.isRecording) {
        console.log('Tab closed during recording, stopping recording...');
        recorderManager.stopRecording().catch(console.error);
    }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
    console.log('MediaSoup Tab Recorder extension started');
});

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
    console.log('MediaSoup Tab Recorder extension installed');
});

