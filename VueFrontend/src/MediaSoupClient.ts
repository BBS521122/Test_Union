import * as mediasoupClient from 'mediasoup-client';

// 统一日志系统 - 将重要日志发送到background.js
class UnifiedLogger {
    private static isExtensionAvailable(): boolean {
        return !!(window as any).chrome?.runtime?.sendMessage;
    }
    
    static log(level: 'log' | 'warn' | 'error', message: string, data?: any) {
        // 本地控制台输出
        console[level](`[MediaSoupClient] ${message}`, data || '');
        
        // 发送到background.js（如果扩展可用）
        if (this.isExtensionAvailable()) {
            try {
                (window as any).chrome.runtime.sendMessage({
                    type: 'unified-log',
                    target: 'background',
                    data: {
                        source: 'MediaSoupClient',
                        level: level,
                        message: message,
                        data: data,
                        timestamp: new Date().toISOString(),
                        url: window.location.href
                    }
                }).catch((err: any) => {
                    // 静默处理发送失败，避免循环错误
                });
            } catch (err) {
                // 静默处理发送失败
            }
        }
    }
    
    static info(message: string, data?: any) {
        this.log('log', message, data);
    }
    
    static warn(message: string, data?: any) {
        this.log('warn', message, data);
    }
    
    static error(message: string, data?: any) {
        this.log('error', message, data);
    }
}

// Chrome扩展录制器接口声明
declare global {
    interface Window {
        MediaSoupTabRecorder?: {
            isAvailable: boolean;
            isRecording: boolean;
            onRecordingStarted?: (data: any) => void;
            onRecordingStopped?: (data: any) => void;
            onUploadSuccess?: (data: any) => void;
            onUploadFailed?: (data: any) => void;
            onError?: (error: any) => void;
            startRecording(config?: any): Promise<any>;
            stopRecording(): Promise<any>;
            getRecordingStatus(): Promise<{ isRecording: boolean; duration: number }>;
            waitForReady?(timeout?: number): Promise<boolean>;
        };
    }
}

export interface MeetingConfig {
    roomId: string;
    isCreator: boolean;
    serverUrl: string;
}

export interface Message {
    id: string;
    peerId: string;
    content: string;
    timestamp: string;
    isCreator: boolean;
}

export class MediaSoupClientService {
    private device: mediasoupClient.Device | null = null;
    private sendTransport: any = null;
    private recvTransport: any = null;
    private producers: Map<string, any> = new Map();
    private consumers: Map<string, any> = new Map();
    private ws: WebSocket | null = null;
    private serverUrl: string = '';
    private roomId: string = '';
    private isCreator: boolean = false;
    private peerId: string = '';

    // 事件回调
    private onNewConsumer?: (consumer: any, peerId: string) => void;
    private onConsumerClosed?: (consumerId: string) => void;
    private onNewMessage?: (message: Message) => void;
    private onUserJoined?: (peerId: string, isCreator: boolean) => void;
    private onUserLeft?: (peerId: string) => void;
    private onRecordingStarted?: (data: any) => void;
    private onRecordingStopped?: (data: any) => void;

    // Chrome扩展录制相关
    private isExtensionRecording: boolean = false;
    private recordingStartTime: number = 0;
    
    private onMuteStatusChanged?: (muteAll: boolean) => void;
    private onMainVideoChanged?: (producerId: string) => void;
    private onNeedUserGesture?: () => void;

    constructor() {
        this.device = new mediasoupClient.Device();
    }

    // 设置事件监听器
    setEventListeners(listeners: {
        onNewConsumer?: (consumer: any, peerId: string) => void;
        onConsumerClosed?: (consumerId: string) => void;
        onNewMessage?: (message: Message) => void;
        onUserJoined?: (peerId: string, isCreator: boolean) => void;
        onUserLeft?: (peerId: string) => void;
        onRecordingStarted?: (data: any) => void;
        onRecordingStopped?: (data: any) => void;
        onMuteStatusChanged?: (muteAll: boolean) => void;
        onMainVideoChanged?: (producerId: string) => void;
        onNeedUserGesture?: () => void;
    }) {
        Object.assign(this, listeners);
    }

    // 初始化设备
    async initDevice() {
        try {
            const response = await fetch(`${this.serverUrl}/api/rtpCapabilities`);
            const responseText = await response.text();
            const rtpCapabilities = JSON.parse(responseText);
            await this.device!.load({routerRtpCapabilities: rtpCapabilities});

        } catch (error) {
            UnifiedLogger.error('设备初始化失败', error);
            if (error instanceof Error) {
                UnifiedLogger.error('错误信息', error.message);
                UnifiedLogger.error('错误堆栈', error.stack);
            }
            throw error;
        }
    }

    // 连接到会议
    async connect(config: MeetingConfig) {
        this.serverUrl = config.serverUrl;
        this.roomId = config.roomId;
        this.isCreator = config.isCreator;

        try {
            // 初始化设备
            await this.initDevice();

            // 建立WebSocket连接
            await this.connectWebSocket();

            // 等待 connected 消消息，拿到 peerId 后再创建传输
            await new Promise<void>((resolve) => {
                const originalHandler = this.handleWebSocketMessage.bind(this);
                this.handleWebSocketMessage = async (data: any) => {
                    await originalHandler(data);
                    if (data.type === 'connected') {
                        resolve();
                        // 恢复原有 handler
                        this.handleWebSocketMessage = originalHandler;
                    }
                };
            });

            // 创建传输
            await this.createTransports();

            // 加入房间
            this.sendWebSocketMessage({
                type: 'joinRoom',
                id: this.roomId,
                isCreator: this.isCreator
            });

            console.log('成功连接到会议');
            UnifiedLogger.info('成功连接到会议');
        } catch (error) {
            console.error('连接会议失败:', error);
            UnifiedLogger.error('连接会议失败', error);
            throw error;
        }
    }

    // 建立WebSocket连接
    private async connectWebSocket(): Promise<void> {
        return new Promise((resolve, reject) => {
            const wsUrl = this.serverUrl.replace('http', 'ws');
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('WebSocket连接已建立');
                resolve();
            };

            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            };

            this.ws.onclose = () => {
                console.log('WebSocket连接已关闭');
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket连接错误:', error);
                reject(error);
            };
        });
    }

    // 处理WebSocket消息
    private async handleWebSocketMessage(data: any) {
        console.log('=== 处理WebSocket消息 ===');
        console.log('消息类型:', data.type);
        console.log('完整消息:', data);
        
        switch (data.type) {
            case 'connected':
                this.peerId = data.peerId;
                console.log('✅ 连接确认，peerId:', this.peerId);
                break;
            case 'roomJoined':
                console.log('✅ 成功加入房间');
                break;
            case 'userJoined':
                console.log('👤 用户加入:', data.peerId, '是否创建者:', data.isCreator);
                this.onUserJoined?.(data.peerId, data.isCreator);
                break;
            case 'userLeft':
                console.log('👤 用户离开:', data.peerId);
                this.onUserLeft?.(data.peerId);
                break;
            case 'newMessage':
                console.log('💬 新消息:', data.message);
                this.onNewMessage?.(data.message);
                break;
            case 'recordingStarted':
                console.log('🔴 后端录制开始通知（已忽略）:', data);
                // 不再处理后端录制，改用前端录制
                break;
            case 'recordingStopped':
                console.log('⏹️ 后端录制停止通知（已忽略）:', data);
                // 不再处理后端录制，改用前端录制
                break;
            case 'muteStatusChanged':
                console.log('🔇 禁言状态变化:', data.muteAll);
                this.onMuteStatusChanged?.(data.muteAll);
                break;
            case 'mainVideoChanged':
                console.log('📺 主视频变化:', data);
                this.onMainVideoChanged?.(data);
                break;
            case 'newProducer':
                console.log('🎬 新生产者:', {
                    producerId: data.producerId,
                    peerId: data.peerId,
                    appData: data.appData,
                    kind: data.kind
                });
                if (data.appData?.type === 'creator-video') {
                    console.log('🎯 这是创建者视频流，准备订阅...');
                    try {
                        await this.consume(data.producerId, data.peerId);
                        console.log('✅ 创建者视频流订阅成功');
                    } catch (error) {
                        console.error('❌ 创建者视频流订阅失败:', error);
                    }
                } else if (data.appData?.type === 'creator-audio') {
                    console.log('🎯 这是创建者音频流，准备订阅...');
                    try {
                        await this.consume(data.producerId, data.peerId);
                        console.log('✅ 创建者音频流订阅成功');
                    } catch (error) {
                        console.error('❌ 创建者音频流订阅失败:', error);
                    }
                } else if (data.appData?.type === 'screen') {
                    // 新增：非创建者自动订阅屏幕共享流
                    if (!this.isCreator) {
                        console.log('🖥️ 检测到屏幕共享流，非创建者自动订阅...');
                        try {
                            await this.consume(data.producerId, data.peerId);
                            console.log('✅ 屏幕共享流订阅成功');
                        } catch (error) {
                            console.error('❌ 屏幕共享流订阅失败:', error);
                        }
                    } else {
                        console.log('ℹ️ 创建者收到屏幕共享流，跳过订阅');
                    }
                } else {
                    console.log('ℹ️ 非创建者媒体流，跳过订阅');
                }
                break;
            case 'error':
                console.error('❌ 服务器错误:', data.message);
                break;
            default:
                console.warn('⚠️ 未知消息类型:', data.type);
        }
    }

    // 发送WebSocket消息
    sendWebSocketMessage(message: any) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('📤 发送WebSocket消息:', message);
            this.ws.send(JSON.stringify(message));
        } else {
            console.warn('⚠️ WebSocket连接不可用，无法发送消息:', message);
        }
    }

    // 创建传输
    private async createTransports() {
        console.log('=== 创建传输开始 ===');
        console.log('peerId:', this.peerId);
        
        // 创建发送传输
        const sendTransportResponse = await fetch(`${this.serverUrl}/api/createWebRtcTransport`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({producing: true, consuming: false, peerId: this.peerId})
        });
        const sendTransportData = await sendTransportResponse.json();

        console.log('✅ 发送传输数据:', {
            id: sendTransportData.id,
            iceParametersKeys: Object.keys(sendTransportData.iceParameters || {}),
            iceCandidatesCount: sendTransportData.iceCandidates?.length || 0,
            dtlsParametersKeys: Object.keys(sendTransportData.dtlsParameters || {})
        });

        this.sendTransport = this.device!.createSendTransport({
            id: sendTransportData.id,
            iceParameters: sendTransportData.iceParameters,
            iceCandidates: sendTransportData.iceCandidates,
            dtlsParameters: sendTransportData.dtlsParameters
        });

        this.sendTransport.on('connect', async ({dtlsParameters}: {
            dtlsParameters: any
        }, callback: () => void, errback: (error: any) => void) => {
            try {
                console.log('📡 连接发送传输...');
                await fetch(`${this.serverUrl}/api/connectTransport`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        transportId: this.sendTransport!.id,
                        dtlsParameters
                    })
                });
                console.log('✅ 发送传输连接成功');
                callback();
            } catch (error) {
                console.error('❌ 发送传输连接失败:', error);
                errback(error);
            }
        });


        this.sendTransport.on('produce', async ({kind, rtpParameters, appData}: {
            kind: string;
            rtpParameters: any;
            appData: any
        }, callback: (data: { id: string }) => void, errback: (error: any) => void) => {
            try {
                console.log('🎬 开始生产媒体流:', { kind, appData });
                const response = await fetch(`${this.serverUrl}/api/produce`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        transportId: this.sendTransport!.id,
                        kind,
                        rtpParameters,
                        appData
                    })
                });
                const {id} = await response.json();
                console.log('✅ 生产者创建成功，ID:', id);
                callback({id});
            } catch (error) {
                console.error('❌ 生产者创建失败:', error);
                errback(error);
            }
        });

        // 创建接收传输
        const recvTransportResponse = await fetch(`${this.serverUrl}/api/createWebRtcTransport`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({producing: false, consuming: true, peerId: this.peerId})
        });
        const recvTransportData = await recvTransportResponse.json();

        console.log('✅ 接收传输数据:', {
            id: recvTransportData.id,
            iceParametersKeys: Object.keys(recvTransportData.iceParameters || {}),
            iceCandidatesCount: recvTransportData.iceCandidates?.length || 0,
            dtlsParametersKeys: Object.keys(recvTransportData.dtlsParameters || {})
        });

        this.recvTransport = this.device!.createRecvTransport({
            id: recvTransportData.id,
            iceParameters: recvTransportData.iceParameters,
            iceCandidates: recvTransportData.iceCandidates,
            dtlsParameters: recvTransportData.dtlsParameters
        });

        this.recvTransport.on('connect', async ({dtlsParameters}: {
            dtlsParameters: any
        }, callback: () => void, errback: (error: any) => void) => {
            try {
                console.log('📡 连接接收传输...');
                await fetch(`${this.serverUrl}/api/connectTransport`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        transportId: this.recvTransport!.id,
                        dtlsParameters
                    })
                });
                console.log('✅ 接收传输连接成功');
                callback();
            } catch (error) {
                console.error('❌ 接收传输连接失败:', error);
                errback(error);
            }
        });
        
        console.log('=== 传输创建完成 ===');
    }

    // 开始生产媒体流
    async produce(track: MediaStreamTrack, appData: any = {}) {
        console.log('=== 开始创建生产者 ===');
        console.log('track kind:', track.kind);
        console.log('track enabled:', track.enabled);
        console.log('track readyState:', track.readyState);
        console.log('appData:', appData);
        
        if (!this.sendTransport) {
            throw new Error('发送传输未初始化');
        }
        
        const producer = await this.sendTransport.produce({
            track,
            appData
        });
        
        console.log('✅ 生产者创建成功:', {
            id: producer.id,
            kind: producer.kind,
            paused: producer.paused,
            appData: producer.appData
        });
        
        this.producers.set(producer.id, producer);
        return producer;
    }

    // 消费媒体流
    async consume(producerId: string, peerId: string) {
        console.log('=== 开始订阅生产者 ===');
        console.log('producerId:', producerId);
        console.log('peerId:', peerId);
        console.log('recvTransport ID:', this.recvTransport?.id);
        console.log('device loaded:', this.device?.loaded);
        
        if (!this.recvTransport || !this.device) {
            console.error('❌ 接收传输或设备未初始化');
            throw new Error('接收传输或设备未初始化');
        }

        console.log('📡 发送消费请求...');
        const response = await fetch(`${this.serverUrl}/api/consume`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                transportId: this.recvTransport.id,
                producerId,
                rtpCapabilities: this.device.rtpCapabilities
            })
        });

        const consumerData = await response.json();
        console.log('✅ 消费者数据响应:', {
            id: consumerData.id,
            producerId: consumerData.producerId,
            kind: consumerData.kind,
            rtpParametersKeys: Object.keys(consumerData.rtpParameters || {}),
            appData: consumerData.appData // 🔥 关键：记录 appData
        });

        console.log('🔄 创建本地消费者...');
        const consumer = await this.recvTransport.consume({
            id: consumerData.id,
            producerId: consumerData.producerId,
            kind: consumerData.kind,
            rtpParameters: consumerData.rtpParameters,
            appData: consumerData.appData || {} // 🔥 关键修复：将 appData 传递给 consumer
        });
        
        console.log('✅ 消费者创建成功:', {
            id: consumer.id,
            kind: consumer.kind,
            paused: consumer.paused,
            track: !!consumer.track,
            trackId: consumer.track?.id,
            trackEnabled: consumer.track?.enabled,
            trackReadyState: consumer.track?.readyState,
            appData: consumer.appData // 🔥 关键：验证 appData 是否正确设置
        });

        this.consumers.set(consumer.id, consumer);

        console.log('📡 恢复消费者...');
        await fetch(`${this.serverUrl}/api/resumeConsumer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ consumerId: consumer.id })
        });

        console.log('✅ 消费者恢复完成，调用回调...');
        this.onNewConsumer?.(consumer, peerId);
        return consumer;
    }

    // 发送消息
    sendMessage(content: string) {
        this.sendWebSocketMessage({
            type: 'sendMessage',
            content
        });
    }

    // 禁言/解除禁言
    muteAll(mute: boolean) {
        if (!this.isCreator) return;

        this.sendWebSocketMessage({
            type: 'muteUser',
            mute
        });
    }

    /**
     * 创建者媒体流：创建者发布视频和音频流，非创建者订阅媒体流
     * @date 2025-7-1 20:44
     */
    async handleCreatorVideo() {
        console.log('=== 处理创建者媒体流 ===');
        console.log('isCreator:', this.isCreator);
        console.log('peerId:', this.peerId);
        
        if (this.isCreator) {
            console.log('👑 创建者模式：上传视频和音频流');
            try {
                // 同时获取视频和音频流
                const mediaStream = await navigator.mediaDevices.getUserMedia({ 
                    video: true, 
                    audio: true 
                });
                
                const videoTrack = mediaStream.getVideoTracks()[0];
                const audioTrack = mediaStream.getAudioTracks()[0];
                
                console.log('📹 获取视频流成功:', {
                    trackId: videoTrack.id,
                    kind: videoTrack.kind,
                    enabled: videoTrack.enabled,
                    readyState: videoTrack.readyState,
                    label: videoTrack.label
                });
                
                if (audioTrack) {
                    console.log('🎤 获取音频流成功:', {
                        trackId: audioTrack.id,
                        kind: audioTrack.kind,
                        enabled: audioTrack.enabled,
                        readyState: audioTrack.readyState,
                        label: audioTrack.label
                    });
                }
                
                // 发布视频流
                await this.produce(videoTrack, { type: 'creator-video' });
                console.log('✅ 创建者视频流发布完成');
                
                // 发布音频流
                if (audioTrack) {
                    await this.produce(audioTrack, { type: 'creator-audio' });
                    console.log('✅ 创建者音频流发布完成');
                } else {
                    console.warn('⚠️ 未获取到音频流');
                }
                
                // 创建者也需要看到自己的视频和听到自己的音频
                console.log('📺 为创建者设置本地媒体流');
                
                // 通过回调通知前端显示本地视频
                if (this.onNewConsumer) {
                    // 创建一个模拟的消费者对象来传递本地视频流
                    const mockVideoConsumer = {
                        id: 'local-creator-video',
                        kind: 'video',
                        track: videoTrack,
                        appData: { type: 'creator-video', isLocal: true }
                    };
                    
                    console.log('📤 通知前端显示创建者本地视频');
                    this.onNewConsumer(mockVideoConsumer, this.peerId);
                    
                    // 创建一个模拟的消费者对象来传递本地音频流
                    if (audioTrack) {
                        const mockAudioConsumer = {
                            id: 'local-creator-audio',
                            kind: 'audio',
                            track: audioTrack,
                            appData: { type: 'creator-audio', isLocal: true }
                        };
                        
                        console.log('📤 通知前端播放创建者本地音频');
                        this.onNewConsumer(mockAudioConsumer, this.peerId);
                    }
                }
                
            } catch (error) {
                console.error('❌ 创建者视频流处理失败:', error);
                throw error;
            }
        } else {
            console.log('👥 非创建者模式：订阅创建者视频流');
            if (this.ws) {
                console.log('✅ WebSocket已连接，设置消息监听器');
                // 保存原来的onmessage，避免覆盖
                const originalOnMessage = this.ws.onmessage;
                
                this.ws.onmessage = async (event) => {
                    const data = JSON.parse(event.data);
                    console.log('📨 非创建者接收到消息:', {
                        type: data.type,
                        data: data
                    });
                    
                    // 调用原来的消息处理器
                    if (originalOnMessage && this.ws) {
                        originalOnMessage.call(this.ws, event);
                    }
                    
                    // 额外处理newProducer消息
                    if (data.type === 'newProducer') {
                        if (data.appData?.type === 'creator-video') {
                            console.log('🎬 发现创建者视频生产者:', {
                                producerId: data.producerId,
                                peerId: data.peerId,
                                appData: data.appData
                            });
                            try {
                                await this.consume(data.producerId, data.peerId);
                                console.log('✅ 成功订阅创建者视频流');
                            } catch (error) {
                                console.error('❌ 订阅创建者视频流失败:', error);
                            }
                        } else if (data.appData?.type === 'creator-audio') {
                            console.log('🎤 发现创建者音频生产者:', {
                                producerId: data.producerId,
                                peerId: data.peerId,
                                appData: data.appData
                            });
                            try {
                                await this.consume(data.producerId, data.peerId);
                                console.log('✅ 成功订阅创建者音频流');
                            } catch (error) {
                                console.error('❌ 订阅创建者音频流失败:', error);
                            }
                        }
                    }
                };
            } else {
                console.error('❌ WebSocket 未初始化');
            }
        }
    }

    // 切换主视频
    switchMainVideo(data: { mainStreamId?: string, secondaryStreamId?: string, producerId?: string }) {
        if (!this.isCreator) {
            console.log('⚠️ 非创建者无法切换主视频');
            return;
        }

        console.log('📺 创建者发送主视频切换请求:', data);
        this.sendWebSocketMessage({
            type: 'switchMainVideo',
            ...data
        });
    }

    // 开始Chrome扩展录制
    async startRecording() {
        if (!this.isCreator) {
            console.warn('⚠️ 只有创建者可以开始录制');
            return;
        }

        console.log('🎥 开始Chrome扩展录制...');

        try {
            // 检查扩展是否可用
            if (!window.MediaSoupTabRecorder?.isAvailable) {
                throw new Error('Chrome扩展不可用，请安装MediaSoup Tab Recorder扩展');
            }

            if (this.isExtensionRecording) {
                console.warn('⚠️ 录制已在进行中');
                return;
            }

            // 使用Chrome扩展开始录制，确保包含音频
            const result = await window.MediaSoupTabRecorder.startRecording({
                roomId: this.roomId,
                peerId: this.peerId,
                audio: true, // 确保录制音频
                video: true, // 确保录制视频
                mimeType: 'video/webm;codecs=vp9,opus' // 指定编解码器，确保音频兼容性
            });

            console.log('✅ 扩展录制开始成功:', result);

            this.isExtensionRecording = true;
            this.recordingStartTime = Date.now();

            // 设置扩展事件监听器
            window.MediaSoupTabRecorder.onRecordingStarted = (data) => {
                console.log('📹 扩展录制开始回调:', data);
                this.onRecordingStarted?.({
                    success: true,
                    method: 'extension',
                    format: data.mimeType,
                    message: '扩展录制已开始'
                });
            };

            window.MediaSoupTabRecorder.onRecordingStopped = (data) => {
                console.log('⏹️ 扩展录制停止回调:', data);
                this.isExtensionRecording = false;
                this.onRecordingStopped?.({
                    success: true,
                    method: 'extension',
                    duration: data.duration,
                    message: '扩展录制已停止，正在上传...'
                });
            };

            window.MediaSoupTabRecorder.onUploadSuccess = (data) => {
                console.log('✅ 录制文件上传成功回调:', data);
                // 可以在这里添加成功提示
                console.log('🎉 录制文件已成功上传到服务器');
            };

            window.MediaSoupTabRecorder.onUploadFailed = (data) => {
                console.error('❌ 录制文件上传失败回调:', data);
                // 可以在这里添加失败提示或fallback处理
                console.error('💥 录制文件上传失败，文件将自动下载到本地');
            };

            window.MediaSoupTabRecorder.onError = (error) => {
                console.error('❌ 扩展录制错误:', error);
                this.isExtensionRecording = false;
            };

            this.onRecordingStarted?.({
                success: true,
                method: 'extension',
                format: result.mimeType,
                message: '扩展录制已开始'
            });

        } catch (error) {
            console.error('❌ 启动扩展录制失败:', error);
            this.isExtensionRecording = false;
            throw error;
        }
    }

    // 停止Chrome扩展录制
    async stopRecording() {
        if (!this.isCreator) {
            console.warn('⚠️ 只有创建者可以停止录制');
            return;
        }

        if (!this.isExtensionRecording) {
            console.warn('⚠️ 当前没有进行录制');
            return;
        }

        console.log('⏹️ 停止Chrome扩展录制...');

        try {
            // 检查扩展是否可用
            if (!window.MediaSoupTabRecorder?.isAvailable) {
                throw new Error('Chrome扩展不可用');
            }

            // 使用Chrome扩展停止录制
            const result = await window.MediaSoupTabRecorder.stopRecording();

            console.log('✅ 扩展录制停止成功:', result);

            const duration = Date.now() - this.recordingStartTime;
            this.isExtensionRecording = false;

            this.onRecordingStopped?.({
                success: true,
                method: 'extension',
                duration: duration,
                message: '扩展录制已停止'
            });

        } catch (error) {
            console.error('❌ 停止扩展录制失败:', error);
            throw error;
        }
    }

    // 获取录制状态
    async getRecordingStatus() {
        try {
            if (!window.MediaSoupTabRecorder?.isAvailable) {
                return {
                    isRecording: false,
                    method: 'extension',
                    error: '扩展不可用'
                };
            }

            const status = await window.MediaSoupTabRecorder.getRecordingStatus();
            
            return {
                isRecording: status.isRecording,
                duration: status.duration,
                method: 'extension'
            };

        } catch (error) {
            console.error('❌ 获取录制状态失败:', error);
            return {
                isRecording: false,
                method: 'extension',
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    // 检查扩展是否可用
    isRecordingExtensionAvailable(): boolean {
        const hasExtension = !!window.MediaSoupTabRecorder;
        const isAvailable = window.MediaSoupTabRecorder?.isAvailable;
        
        console.log('🔌 扩展检查详情:', {
            hasExtension,
            isAvailable,
            extensionObject: !!window.MediaSoupTabRecorder,
            userAgent: navigator.userAgent,
            isChrome: /Chrome/.test(navigator.userAgent)
        });
        
        if (!hasExtension) {
            console.warn('❌ 扩展对象不存在，请确保已安装MediaSoup Tab Recorder扩展');
        } else if (!isAvailable) {
            console.warn('⚠️ 扩展对象存在但不可用，可能正在初始化中');
        }
        
        return !!isAvailable;
    }

    // 异步检查扩展可用性（带重试）
    async checkExtensionAvailable(maxRetries = 10, retryDelay = 500): Promise<boolean> {
        console.log('🔍 开始异步检查扩展可用性...');
        
        // 首先尝试使用waitForReady方法
        if (window.MediaSoupTabRecorder?.waitForReady) {
            try {
                console.log('📡 使用waitForReady方法等待扩展就绪...');
                await window.MediaSoupTabRecorder.waitForReady(3000);
                console.log('✅ 扩展通过waitForReady方法检查成功');
                return true;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.warn('⚠️ waitForReady方法失败，回退到轮询检查:', errorMessage);
            }
        }
        
        // 回退到轮询检查
        for (let i = 0; i < maxRetries; i++) {
            const available = this.isRecordingExtensionAvailable();
            
            if (available) {
                console.log(`✅ 扩展轮询检查成功 (第${i + 1}次尝试)`);
                return true;
            }
            
            console.log(`⏰ 扩展暂不可用，等待${retryDelay}ms后重试 (${i + 1}/${maxRetries})`);
            
            if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }
        
        console.warn(`❌ 扩展检查失败，已重试${maxRetries}次`);
        return false;
    }

    // 启动扩展录制（异步版本，带扩展可用性检查）
    async startExtensionRecording(config?: any): Promise<void> {
        if (!this.isCreator) {
            throw new Error('只有创建者可以开始录制');
        }

        if (this.isExtensionRecording) {
            console.warn('⚠️ 录制已在进行中');
            return;
        }

        console.log('🔴 开始Chrome扩展录制...');
        UnifiedLogger.info('🔴 开始Chrome扩展录制', { roomId: this.roomId, peerId: this.peerId });

        try {
            // 先检查扩展可用性
            const available = await this.checkExtensionAvailable();
            if (!available) {
                throw new Error('Chrome扩展不可用，请确保已安装并启用MediaSoup Tab Recorder扩展');
            }
            
            // 额外检测扩展状态
            const extensionOK = await this.checkExtensionStatus();
            if (!extensionOK) {
                throw new Error('EXTENSION_NOT_ACTIVATED');
            }

            // 使用Chrome扩展开始录制，合并默认音频配置，多种编解码器选项
            const recordingConfig = {
                roomId: this.roomId,
                peerId: this.peerId,
                audio: true, // 默认启用音频
                video: true, // 默认启用视频
                audioConstraints: {
                    echoCancellation: true, // 启用回音消除
                    noiseSuppression: true, // 启用噪音抑制
                    autoGainControl: true   // 启用自动增益控制
                },
                videoConstraints: {
                    width: { ideal: 1280 },  // 较低分辨率提高兼容性
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 }
                },
                preferredMimeTypes: [
                    'video/webm;codecs=vp8,opus', // 最广泛支持的配置
                    'video/webm;codecs=vp9,opus',
                    'video/webm;codecs=h264,opus',
                    'video/webm'
                ],
                ...config // 允许外部配置覆盖默认设置
            };
            
            UnifiedLogger.info('开始录制，配置', recordingConfig);
            const result = await window.MediaSoupTabRecorder!.startRecording(recordingConfig);

            console.log('✅ 扩展录制开始成功:', result);
            UnifiedLogger.info('✅ 扩展录制开始成功', result);

            this.isExtensionRecording = true;
            this.recordingStartTime = Date.now();

            this.onRecordingStarted?.({
                success: true,
                method: 'extension',
                message: '扩展录制已开始',
                ...result
            });

        } catch (error) {
            console.error('❌ 开始扩展录制失败:', error);
            UnifiedLogger.error('❌ 开始扩展录制失败', {
                error: error instanceof Error ? {
                    message: error.message,
                    name: error.name,
                    stack: error.stack
                } : error,
                roomId: this.roomId,
                peerId: this.peerId
            });
            
            // 检查是否是activeTab权限问题或运行时上下文错误
            if (error instanceof Error && (
                error.message.includes('activeTab permission') ||
                error.message.includes('runtime.getContexts') ||
                error.message.includes('contextTypes')
            )) {
                throw new Error('EXTENSION_NOT_ACTIVATED');
            }
            
            // 检查是否是用户手势错误 - 包括多种可能的错误消息
            if (error instanceof Error && (
                error.message === 'NEED_USER_GESTURE' ||
                error.message.includes('user gesture') ||
                error.message.includes('User gesture') ||
                error.message.includes('user activation') ||
                error.message.includes('GESTURE') ||
                error.message.includes('permission denied') ||
                error.message.includes('not allowed') ||
                (error.name === 'NotAllowedError')
            )) {
                console.warn('⚠️ 检测到用户手势不足，触发回调要求用户手动启动');
                UnifiedLogger.warn('⚠️ 检测到用户手势不足，触发回调要求用户手动启动', { 
                    errorMessage: error.message,
                    errorName: error.name 
                });
                // 触发用户手势需求回调，显示提示对话框
                this.onNeedUserGesture?.();
                throw new Error('录制需要用户手势。请点击浏览器工具栏中的 "MediaSoup Tab Recorder" 扩展图标来启动录制。');
            }
            
            // 检查是否是 ABORT_ERROR
            if (error instanceof Error && (
                error.message === 'ABORT_ERROR' ||
                error.message.includes('ABORT_ERROR') ||
                error.message.includes('录制被中止') ||
                error.message.includes('aborted') ||
                error.message.includes('AbortError')
            )) {
                console.error('🚨 检测到 ABORT_ERROR，执行用户指导');
                UnifiedLogger.error('🚨 检测到 ABORT_ERROR，执行用户指导', {
                    errorMessage: error.message,
                    errorName: error.name
                });
                // 触发用户手势需求回调，显示提示对话框
                this.onNeedUserGesture?.();
                throw new Error('录制被中止，可能是权限问题或设备冲突。请点击浏览器工具栏中的扩展图标重新启动录制。');
            }
            
            throw error;
        }
    }

    // 停止扩展录制（异步版本）
    async stopExtensionRecording(): Promise<void> {
        if (!this.isCreator) {
            throw new Error('只有创建者可以停止录制');
        }

        if (!this.isExtensionRecording) {
            console.warn('⚠️ 当前没有进行录制');
            return;
        }

        console.log('⏹️ 停止Chrome扩展录制...');

        try {
            // 检查扩展是否可用
            if (!window.MediaSoupTabRecorder?.isAvailable) {
                throw new Error('Chrome扩展不可用');
            }

            // 使用Chrome扩展停止录制
            const result = await window.MediaSoupTabRecorder.stopRecording();

            console.log('✅ 扩展录制停止成功:', result);

            const duration = Date.now() - this.recordingStartTime;
            this.isExtensionRecording = false;

            this.onRecordingStopped?.({
                success: true,
                method: 'extension',
                duration: duration,
                message: '扩展录制已停止',
                ...result
            });

        } catch (error) {
            console.error('❌ 停止扩展录制失败:', error);
            throw error;
        }
    }

    // 检测扩展状态
    async checkExtensionStatus(): Promise<boolean> {
        try {
            const extensionAvailable = (window as any).MediaSoupTabRecorder?.isAvailable;
            
            // 如果扩展未就绪，尝试等待
            if (!extensionAvailable && (window as any).MediaSoupTabRecorder) {
                try {
                    await (window as any).MediaSoupTabRecorder.waitForReady(3000);
                    return true;
                } catch (error) {
                    console.warn('扩展未就绪:', error);
                    return false;
                }
            }
            
            return !!extensionAvailable;
        } catch (error) {
            console.error('检测扩展状态出错:', error);
            return false;
        }
    }

    // 关闭摄像头相关的生产者
    async closeCameraProducers() {
        console.log('🔄 关闭摄像头相关的生产者...');
        
        const cameraProducers = Array.from(this.producers.values()).filter(producer => 
            producer.appData?.type === 'camera' || producer.appData?.type === 'audio'
        );
        
        for (const producer of cameraProducers) {
            try {
                console.log('⏹️ 关闭生产者:', {
                    id: producer.id,
                    kind: producer.kind,
                    type: producer.appData?.type
                });
                
                producer.close();
                this.producers.delete(producer.id);
                
                console.log('✅ 生产者已关闭:', producer.id);
            } catch (error) {
                console.error('❌ 关闭生产者失败:', producer.id, error);
            }
        }
    }

    // 关闭屏幕共享相关的生产者
    async closeScreenProducers() {
        console.log('🔄 关闭屏幕共享相关的生产者...');
        
        const screenProducers = Array.from(this.producers.values()).filter(producer => 
            producer.appData?.type === 'screen' || producer.appData?.type === 'screen-audio'
        );
        
        for (const producer of screenProducers) {
            try {
                console.log('⏹️ 关闭生产者:', {
                    id: producer.id,
                    kind: producer.kind,
                    type: producer.appData?.type
                });
                
                producer.close();
                this.producers.delete(producer.id);
                
                console.log('✅ 生产者已关闭:', producer.id);
            } catch (error) {
                console.error('❌ 关闭生产者失败:', producer.id, error);
            }
        }
    }

    // 关闭所有生产者
    async closeAllProducers() {
        console.log('🔄 关闭所有生产者...');
        
        for (const [id, producer] of this.producers) {
            try {
                console.log('⏹️ 关闭生产者:', {
                    id: producer.id,
                    kind: producer.kind,
                    type: producer.appData?.type
                });
                
                producer.close();
                
                console.log('✅ 生产者已关闭:', producer.id);
            } catch (error) {
                console.error('❌ 关闭生产者失败:', producer.id, error);
            }
        }
        
        this.producers.clear();
    }
}

export default MediaSoupClientService;

