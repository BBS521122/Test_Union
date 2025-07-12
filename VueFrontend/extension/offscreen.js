// offscreen.js - Handles tabCapture and MediaRecorder in offscreen document

class OffscreenRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.stream = null;
        this.startTime = null;
        this.recordingConfig = null;
        this.isRecording = false;
    }

    // Start recording with the provided configuration
    async startRecording(streamId, config = {}) {
        try {
            if (this.isRecording) {
                throw new Error('Recording is already in progress');
            }

            console.log('Starting recording with streamId:', streamId, 'config:', config);
            this.recordingConfig = config;

            // Get media stream using the provided stream ID
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    mandatory: {
                        chromeMediaSource: 'tab',
                        chromeMediaSourceId: streamId
                    }
                },
                video: {
                    mandatory: {
                        chromeMediaSource: 'tab',
                        chromeMediaSourceId: streamId
                    }
                }
            });

            console.log('Stream captured:', this.stream);
            const audioTracks = this.stream.getAudioTracks();
            console.log('Audio tracks:', audioTracks.length);
            if (audioTracks.length > 0) {
                console.log('Audio track enabled:', audioTracks[0].enabled);
                console.log('Audio track settings:', audioTracks[0].getSettings());
                console.log('Audio track constraints:', audioTracks[0].getConstraints());
            } else {
                console.warn('没有音频轨道被捕获，录制将没有声音！');
            }

            // 创建音频处理管道，确保音频信号流动但不输出声音
            try {
                // 1. 使用AudioContext但不连接到输出
                const audioContext = new AudioContext();
                const source = audioContext.createMediaStreamSource(this.stream);
                
                // 创建一个分析节点，让音频数据流动但不输出到扬声器
                const analyser = audioContext.createAnalyser();
                source.connect(analyser);
                // 故意不连接到audioContext.destination
                
                // 设置分析器以确保音频处理
                analyser.fftSize = 2048;
                const bufferLength = analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);
                
                // 定期处理音频数据，确保信号流动
                const processAudio = () => {
                    if (this.isRecording) {
                        analyser.getByteFrequencyData(dataArray);
                        // 检查是否有声音
                        const hasSound = dataArray.some(value => value > 0);
                        if (hasSound) {
                            console.log('检测到音频信号');
                        }
                        requestAnimationFrame(processAudio);
                    }
                };
                processAudio();
                
                console.log('已创建音频处理管道，确保信号流动但不播放声音');
                
                // 2. 另一种方法：创建静音的audio元素
                const audioElement = document.createElement('audio');
                audioElement.srcObject = this.stream;
                audioElement.muted = true; // 彻底静音，不是音量为0
                audioElement.play().catch(e => console.warn('静音audio元素播放失败:', e));
                
                console.log('已创建静音audio元素作为备用方案');
            } catch (audioError) {
                console.warn('创建音频处理管道失败:', audioError);
            }

            // Determine the best MIME type
            const mimeType = this.getBestMimeType(config.preferredMimeTypes);
            console.log('Using MIME type:', mimeType);

            // Create MediaRecorder with explicit audio options
            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: mimeType,
                audioBitsPerSecond: 128000, // 确保音频比特率足够高
                videoBitsPerSecond: 2500000 // 设置合理的视频比特率
            });
            
            console.log('MediaRecorder创建完成，配置:', {
                mimeType,
                hasAudio: this.stream.getAudioTracks().length > 0,
                hasVideo: this.stream.getVideoTracks().length > 0
            });

            // Set up event handlers
            this.setupMediaRecorderEvents();

            // Start recording
            this.recordedChunks = [];
            this.mediaRecorder.start();
            this.startTime = Date.now();
            this.isRecording = true;

            // 通知页面启用音频播放以确保录制有声音
            chrome.runtime.sendMessage({
                action: 'enableAudioForRecording',
                data: { message: '录制需要启用音频播放' }
            });

            const result = {
                success: true,
                mimeType: mimeType,
                message: '录制开始成功'
            };

            // Notify background script
            chrome.runtime.sendMessage({
                action: 'recordingStarted',
                data: result
            });

            return result;

        } catch (error) {
            console.error('Error starting recording:', error);

            // Clean up on error
            this.cleanup();

            // Handle specific errors
            let errorMessage = error.message;
            if (error.message.includes('permission')) {
                errorMessage = 'activeTab permission required';
            } else if (error.message.includes('gesture')) {
                errorMessage = 'NEED_USER_GESTURE';
            }

            const errorResult = {
                success: false,
                message: errorMessage
            };

            // Notify background script of error
            chrome.runtime.sendMessage({
                action: 'recordingError',
                data: errorResult
            });

            throw new Error(errorMessage);
        }
    }

    // 直接上传录制文件到后端
    async uploadRecording(blob, meetingId) {
        try {
            const formData = new FormData();
            formData.append('id', meetingId);
            formData.append('video', blob, `recording_${Date.now()}.webm`);
            const response = await fetch('http://localhost:8080/conference/upload-record', {
                method: 'POST',
                body: formData
            });
            const result = await response.json().catch(() => ({}));
            // 通知 background 上传结果
            chrome.runtime.sendMessage({
                action: 'uploadResult',
                data: { success: response.ok, result }
            });
            return { success: response.ok, result };
        } catch (error) {
            chrome.runtime.sendMessage({
                action: 'uploadResult',
                data: { success: false, error: error.message }
            });
            return { success: false, error: error.message };
        }
    }

    // Stop recording
    async stopRecording(meetingId) {
        try {
            if (!this.isRecording) {
                throw new Error('No recording in progress');
            }

            console.log('Stopping recording...');

            return new Promise((resolve, reject) => {
                // Set up one-time event listener for stop event
                const handleStop = async () => {
                    const duration = Date.now() - this.startTime;
                    const blob = new Blob(this.recordedChunks, {
                        type: this.mediaRecorder.mimeType
                    });

                    console.log('Recording stopped, blob size:', blob.size);

                    // 直接上传
                    const uploadResult = await this.uploadRecording(blob, meetingId);

                    const result = {
                        success: uploadResult.success,
                        duration: duration,
                        message: uploadResult.success ? '录制并上传成功' : '录制成功但上传失败',
                        fileSize: blob.size,
                        mimeType: blob.type,
                        uploadResult: uploadResult.result || uploadResult.error
                    };

                    // Clean up
                    this.cleanup();

                    resolve(result);
                };

                // Set up error handler
                const handleError = (event) => {
                    console.error('MediaRecorder error during stop:', event);
                    this.cleanup();

                    const errorResult = {
                        success: false,
                        message: 'ABORT_ERROR'
                    };

                    chrome.runtime.sendMessage({
                        action: 'recordingError',
                        data: errorResult
                    });

                    reject(new Error('ABORT_ERROR'));
                };

                // Add event listeners
                this.mediaRecorder.addEventListener('stop', handleStop, { once: true });
                this.mediaRecorder.addEventListener('error', handleError, { once: true });

                // Stop the recording
                this.mediaRecorder.stop();
            });

        } catch (error) {
            console.error('Error stopping recording:', error);
            this.cleanup();

            const errorResult = {
                success: false,
                message: error.message
            };

            chrome.runtime.sendMessage({
                action: 'recordingError',
                data: errorResult
            });

            throw error;
        }
    }

    // Get recording status
    getRecordingStatus() {
        const duration = this.isRecording && this.startTime ?
            Date.now() - this.startTime : 0;

        return {
            success: true,
            data: {
                isRecording: this.isRecording,
                duration: duration
            }
        };
    }

    // Set up MediaRecorder event handlers
    setupMediaRecorderEvents() {
        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.recordedChunks.push(event.data);
                console.log('Data chunk received, size:', event.data.size);
                
                // 检查数据块内容
                console.log('数据块MIME类型:', event.data.type);
                // 提前检查数据块是否包含音频
                if (this.recordedChunks.length === 1) {
                    this.checkRecordingHasAudio(event.data);
                }
            }
        };

        this.mediaRecorder.onerror = (event) => {
            console.error('MediaRecorder error:', event);

            const errorResult = {
                success: false,
                message: 'Recording error: ' + (event.error || 'Unknown error')
            };

            chrome.runtime.sendMessage({
                action: 'recordingError',
                data: errorResult
            });

            this.cleanup();
        };

        this.mediaRecorder.onstart = () => {
            console.log('MediaRecorder started');
        };

        this.mediaRecorder.onstop = () => {
            console.log('MediaRecorder stopped');
        };
    }

    // Get the best supported MIME type
    getBestMimeType(preferredTypes = []) {
        const defaultTypes = [
            'video/webm;codecs=vp8,opus',
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=h264,opus',
            'video/webm',
            'video/mp4'
        ];

        const typesToCheck = [...(preferredTypes || []), ...defaultTypes];

        for (const type of typesToCheck) {
            if (MediaRecorder.isTypeSupported(type)) {
                console.log('Supported MIME type found:', type);
                return type;
            }
        }

        // Fallback
        console.log('Using fallback MIME type: video/webm');
        return 'video/webm';
    }

    // 检查录制是否包含音频
    async checkRecordingHasAudio(dataChunk) {
        try {
            // 创建临时的audio元素
            const tempBlob = new Blob([dataChunk], { type: this.mediaRecorder.mimeType });
            const audioElement = new Audio();
            audioElement.src = URL.createObjectURL(tempBlob);
            
            // 检查音频时长
            audioElement.addEventListener('loadedmetadata', () => {
                console.log('初始数据块音频分析:', {
                    duration: audioElement.duration,
                    hasAudio: !isNaN(audioElement.duration) && audioElement.duration > 0
                });
            });
            
            audioElement.addEventListener('error', (e) => {
                console.warn('音频分析错误:', e.error);
            });
            
            // 尝试播放以确认是否有声音
            try {
                // 设置音量为0避免干扰
                audioElement.volume = 0;
                await audioElement.play();
                // 立即暂停
                setTimeout(() => {
                    audioElement.pause();
                    URL.revokeObjectURL(audioElement.src);
                }, 100);
            } catch (e) {
                console.warn('无法播放数据块进行检查:', e);
            }
        } catch (e) {
            console.error('检查录制音频失败:', e);
        }
    }

    // Clean up resources
    cleanup() {
        this.isRecording = false;

        if (this.stream) {
            this.stream.getTracks().forEach(track => {
                track.stop();
                console.log('Track stopped:', track.kind);
            });
            this.stream = null;
        }

        if (this.mediaRecorder) {
            this.mediaRecorder = null;
        }

        this.recordedChunks = [];
        this.startTime = null;
        this.recordingConfig = null;

        console.log('Offscreen recorder cleaned up');
    }
}

// Create global recorder instance
const offscreenRecorder = new OffscreenRecorder();

// Handle messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Offscreen received message:', message);

    if (message.target !== 'offscreen') {
        return;
    }

    (async () => {
        try {
            switch (message.type) {
                case 'start-recording':
                    const startResult = await offscreenRecorder.startRecording(
                        message.data.streamId,
                        message.data.config
                    );
                    sendResponse(startResult);
                    break;

                case 'stop-recording':
                    const stopResult = await offscreenRecorder.stopRecording(message.data.meetingId);
                    sendResponse(stopResult);
                    break;

                case 'get-status':
                    const statusResult = offscreenRecorder.getRecordingStatus();
                    sendResponse(statusResult);
                    break;

                default:
                    console.warn('Unknown message type:', message.type);
                    sendResponse({
                        success: false,
                        message: 'Unknown message type: ' + message.type
                    });
            }
        } catch (error) {
            console.error('Error handling message:', error);
            sendResponse({
                success: false,
                message: error.message
            });
        }
    })();
    return true; // Keep message channel open for async response
});

// Log when offscreen document is ready
console.log('MediaSoup Tab Recorder offscreen document ready');

