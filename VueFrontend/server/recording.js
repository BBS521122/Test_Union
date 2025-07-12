const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');

// 设置ffmpeg路径
ffmpeg.setFfmpegPath(ffmpegStatic);

class RecordingManager {
    constructor() {
        this.recordings = new Map(); // 存储录制信息
        this.recordingsDir = path.join(__dirname, 'recordings');

        // 确保录制目录存在
        if (!fs.existsSync(this.recordingsDir)) {
            fs.mkdirSync(this.recordingsDir, { recursive: true });
        }
    }

    /**
     * 开始录制会议
     * @param {string} roomId - 房间ID
     * @param {Object} options - 录制选项
     */
    async startRecording(roomId, options = {}) {
        try {
            if (this.recordings.has(roomId)) {
                throw new Error('该房间已在录制中');
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `meeting_${roomId}_${timestamp}.mp4`;
            const outputPath = path.join(this.recordingsDir, filename);

            // 创建录制信息
            const recordingInfo = {
                roomId,
                filename,
                outputPath,
                startTime: new Date(),
                status: 'recording',
                duration: 0,
                process: null
            };

            // 这里应该集成MediaSoup的录制功能
            // 由于MediaSoup的录制比较复杂，这里提供一个基础框架
            // 实际实现需要使用MediaSoup的PlainTransport和RtpObserver

            console.log(`开始录制房间 ${roomId}，输出文件: ${filename}`);

            this.recordings.set(roomId, recordingInfo);

            return {
                success: true,
                recordingId: roomId,
                filename: filename
            };
        } catch (error) {
            console.error('开始录制失败:', error);
            throw error;
        }
    }

    /**
     * 停止录制
     * @param {string} roomId - 房间ID
     */
    async stopRecording(roomId) {
        try {
            const recording = this.recordings.get(roomId);
            if (!recording) {
                throw new Error('未找到录制信息');
            }

            recording.status = 'stopping';
            recording.endTime = new Date();
            recording.duration = recording.endTime - recording.startTime;

            // 停止录制进程
            if (recording.process) {
                recording.process.kill('SIGINT');
            }

            console.log(`停止录制房间 ${roomId}，录制时长: ${Math.round(recording.duration / 1000)}秒`);

            // 更新状态
            recording.status = 'completed';

            return {
                success: true,
                filename: recording.filename,
                duration: recording.duration,
                outputPath: recording.outputPath
            };
        } catch (error) {
            console.error('停止录制失败:', error);
            throw error;
        }
    }

    /**
     * 获取录制状态
     * @param {string} roomId - 房间ID
     */
    getRecordingStatus(roomId) {
        const recording = this.recordings.get(roomId);
        if (!recording) {
            return { status: 'not_recording' };
        }

        return {
            status: recording.status,
            filename: recording.filename,
            startTime: recording.startTime,
            duration: recording.status === 'recording'
                ? new Date() - recording.startTime
                : recording.duration
        };
    }

    /**
     * 获取所有录制文件
     */
    getAllRecordings() {
        const recordings = [];

        for (const [roomId, recording] of this.recordings) {
            recordings.push({
                roomId,
                filename: recording.filename,
                startTime: recording.startTime,
                endTime: recording.endTime,
                duration: recording.duration,
                status: recording.status,
                fileSize: this.getFileSize(recording.outputPath)
            });
        }

        return recordings;
    }

    /**
     * 删除录制文件
     * @param {string} filename - 文件名
     */
    async deleteRecording(filename) {
        try {
            const filePath = path.join(this.recordingsDir, filename);

            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);

                // 从内存中移除记录
                for (const [roomId, recording] of this.recordings) {
                    if (recording.filename === filename) {
                        this.recordings.delete(roomId);
                        break;
                    }
                }

                return { success: true };
            } else {
                throw new Error('文件不存在');
            }
        } catch (error) {
            console.error('删除录制文件失败:', error);
            throw error;
        }
    }

    /**
     * 获取文件大小
     * @param {string} filePath - 文件路径
     */
    getFileSize(filePath) {
        try {
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                return stats.size;
            }
            return 0;
        } catch (error) {
            return 0;
        }
    }

    /**
     * 清理过期录制文件
     * @param {number} maxAge - 最大保存时间（毫秒）
     */
    cleanupOldRecordings(maxAge = 7 * 24 * 60 * 60 * 1000) { // 默认7天
        const now = new Date();

        for (const [roomId, recording] of this.recordings) {
            if (recording.endTime && (now - recording.endTime) > maxAge) {
                this.deleteRecording(recording.filename).catch(console.error);
            }
        }
    }
}

module.exports = RecordingManager;

