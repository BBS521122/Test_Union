// popup.js - Popup interface for the extension

class PopupController {
    constructor() {
        this.isRecording = false;
        this.startTime = null;
        this.durationInterval = null;
        
        this.initializeElements();
        this.setupEventListeners();
        this.updateStatus();
    }

    initializeElements() {
        this.statusEl = document.getElementById('status');
        this.startBtn = document.getElementById('startBtn');
        this.durationEl = document.getElementById('duration');
        this.durationTextEl = document.getElementById('durationText');
    }

    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.startRecording());
    }

    async updateStatus() {
        try {
            // Get current recording status from background script
            const response = await chrome.runtime.sendMessage({
                action: 'getRecordingStatus'
            });

            if (response && response.success && response.data) {
                this.isRecording = response.data.isRecording;
                
                if (this.isRecording) {
                    this.setRecordingState(true);
                    this.startTime = Date.now() - (response.data.duration || 0);
                    this.startDurationTimer();
                } else {
                    this.setRecordingState(false);
                }
            }
        } catch (error) {
            console.error('Error getting status:', error);
        }
    }

    async startRecording() {
        try {
            this.startBtn.disabled = true;
            this.startBtn.textContent = 'Starting...';

            const response = await chrome.runtime.sendMessage({
                action: 'startRecording',
                data: {
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
                }
            });

            if (response && response.success) {
                this.setRecordingState(true);
                this.startTime = Date.now();
                this.startDurationTimer();
                this.showMessage('Recording started successfully!', 'success');
            } else {
                throw new Error(response.message || 'Failed to start recording');
            }

        } catch (error) {
            console.error('Error starting recording:', error);
            this.showMessage('Error: ' + error.message, 'error');
            this.setRecordingState(false);
        }
    }

    setRecordingState(recording) {
        this.isRecording = recording;

        if (recording) {
            // Recording state
            this.statusEl.textContent = 'Recording in Progress';
            this.statusEl.className = 'status recording';
            
            this.startBtn.disabled = true;
            this.startBtn.textContent = 'Recording...';
            this.startBtn.classList.add('disabled');
            
            this.durationEl.style.display = 'block';
        } else {
            // Ready state
            this.statusEl.textContent = 'Ready to Record';
            this.statusEl.className = 'status ready';
            
            this.startBtn.disabled = false;
            this.startBtn.textContent = 'Start Recording';
            this.startBtn.classList.remove('disabled');
            
            this.durationEl.style.display = 'none';
            this.stopDurationTimer();
        }
    }

    startDurationTimer() {
        this.stopDurationTimer();
        
        this.durationInterval = setInterval(() => {
            if (this.startTime) {
                const duration = Date.now() - this.startTime;
                this.updateDurationDisplay(duration);
            }
        }, 1000);
    }

    stopDurationTimer() {
        if (this.durationInterval) {
            clearInterval(this.durationInterval);
            this.durationInterval = null;
        }
    }

    updateDurationDisplay(duration) {
        const seconds = Math.floor(duration / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        const formattedTime = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        this.durationTextEl.textContent = formattedTime;
    }

    showMessage(message, type) {
        // Create a temporary message element
        const messageEl = document.createElement('div');
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            right: 10px;
            padding: 10px;
            border-radius: 5px;
            font-size: 12px;
            z-index: 1000;
            ${type === 'error' ? 'background-color: #ffebee; color: #c62828; border: 1px solid #ef5350;' : 'background-color: #e8f5e8; color: #2e7d32; border: 1px solid #4caf50;'}
        `;
        
        document.body.appendChild(messageEl);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 3000);
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PopupController();
});

