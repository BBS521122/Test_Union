import mediasoup from 'mediasoup';

class MediaManager {
    constructor() {
        this.worker = null;
        this.router = null;
        this.transports = new Map(); // 传输管理
        this.producers = new Map(); // 生产者管理
        this.consumers = new Map(); // 消费者管理
    }

    /**
     * 初始化MediaSoup Worker和Router
     */
    async init() {
        try {
            // 创建MediaSoup Worker
            this.worker = await mediasoup.createWorker({
                logLevel: 'warn',
                rtcMinPort: 10000,
                rtcMaxPort: 10100
            });

            // 监听Worker错误
            this.worker.on('died', () => {
                console.error('MediaSoup Worker died');
                process.exit(1);
            });

            // 创建Router 用于处理媒体流
            this.router = await this.worker.createRouter({
                mediaCodecs: [
                    {
                        kind: 'audio',
                        mimeType: 'audio/opus',
                        clockRate: 48000,
                        channels: 2
                    },
                    {
                        kind: 'video',
                        mimeType: 'video/VP8',
                        clockRate: 90000,
                        parameters: {
                            'x-google-start-bitrate': 1000
                        }
                    },
                    {
                        kind: 'video',
                        mimeType: 'video/VP9',
                        clockRate: 90000,
                        parameters: {
                            'profile-id': 2,
                            'x-google-start-bitrate': 1000
                        }
                    },
                    {
                        kind: 'video',
                        mimeType: 'video/h264',
                        clockRate: 90000,
                        parameters: {
                            'packetization-mode': 1,
                            'profile-level-id': '4d0032',
                            'level-asymmetry-allowed': 1,
                            'x-google-start-bitrate': 1000
                        }
                    }
                ]
            });

            console.log('MediaSoup服务器初始化完成');
        } catch (error) {
            console.error('MediaSoup服务器初始化失败:', error);
            process.exit(1);
        }
    }

    /**
     * 获取RTP能力
     */
    getRtpCapabilities() {
        if (!this.router) {
            throw new Error('Router not initialized');
        }
        return this.router.rtpCapabilities;
    }

    /**
     * 创建WebRTC传输
     */
    async createWebRtcTransport(peerId) {
        const transport = await this.router.createWebRtcTransport({
            listenIps: [
                {
                    ip: '0.0.0.0',
                    announcedIp: '127.0.0.1' // 在生产环境中应该是公网IP
                }
            ],
            enableUdp: true,
            enableTcp: true,
            preferUdp: true
        });

        // 存储transport和peer的关联关系
        transport.peerId = peerId;
        this.transports.set(transport.id, transport);

        return transport;
    }

    /**
     * 连接传输
     */
    async connectTransport(transportId, dtlsParameters) {
        const transport = this.transports.get(transportId);
        if (!transport) {
            throw new Error('Transport not found');
        }
        await transport.connect({ dtlsParameters });
    }

    /**
     * 创建生产者
     */
    async createProducer(transportId, kind, rtpParameters, appData, peerId, roomId) {
        const transport = this.transports.get(transportId);
        if (!transport) {
            throw new Error('Transport not found');
        }

        const producer = await transport.produce({
            kind,
            rtpParameters,
            appData
        });

        // 存储producer及其关联信息
        this.producers.set(producer.id, {
            producer,
            transportId,
            peerId,
            roomId,
            appData: producer.appData
        });

        return producer;
    }

    /**
     * 创建消费者
     */
    async createConsumer(transportId, producerId, rtpCapabilities) {
        const transport = this.transports.get(transportId);
        const producerInfo = this.producers.get(producerId);
        const producer = producerInfo ? producerInfo.producer : null;

        if (!transport || !producer || !producerInfo) {
            throw new Error('Transport or Producer not found');
        }

        const canConsume = this.router.canConsume({ producerId, rtpCapabilities });
        if (!canConsume) {
            throw new Error('Cannot consume - RTP capabilities mismatch');
        }

        const consumer = await transport.consume({
            producerId,
            rtpCapabilities,
            paused: true,
            appData: producerInfo.appData
        });

        this.consumers.set(consumer.id, consumer);

        return {
            consumer,
            producerInfo
        };
    }

    /**
     * 恢复消费者
     */
    async resumeConsumer(consumerId) {
        const consumer = this.consumers.get(consumerId);
        if (!consumer) {
            throw new Error('Consumer not found');
        }
        await consumer.resume();
    }

    /**
     * 根据transportId找到对应的peerId
     */
    findPeerByTransport(transportId) {
        const transport = this.transports.get(transportId);
        if (transport && transport.peerId) {
            return transport.peerId;
        }
        return null;
    }

    /**
     * 获取房间内所有生产者
     */
    getProducersByRoom(roomId) {
        const producers = [];
        for (const [producerId, info] of this.producers) {
            if (info.roomId === roomId) {
                producers.push({
                    producerId,
                    ...info
                });
            }
        }
        return producers;
    }

    /**
     * 清理用户的所有媒体资源
     */
    cleanupPeerResources(peerId) {
        console.log('=== 清理用户媒体资源 ===');
        console.log('用户ID:', peerId);

        // 清理生产者
        const userProducers = [];
        for (const [producerId, info] of this.producers) {
            if (info.peerId === peerId) {
                userProducers.push(producerId);
            }
        }
        
        userProducers.forEach(producerId => {
            console.log('🎬 关闭生产者:', producerId);
            const producerInfo = this.producers.get(producerId);
            if (producerInfo && producerInfo.producer) {
                producerInfo.producer.close();
            }
            this.producers.delete(producerId);
        });

        // 清理消费者
        const userConsumers = [];
        for (const [consumerId, consumer] of this.consumers) {
            // 检查消费者是否属于该用户的传输
            const transport = this.transports.get(consumer.transportId);
            if (transport && transport.peerId === peerId) {
                userConsumers.push(consumerId);
            }
        }
        
        userConsumers.forEach(consumerId => {
            console.log('🎥 关闭消费者:', consumerId);
            const consumer = this.consumers.get(consumerId);
            if (consumer) {
                consumer.close();
            }
            this.consumers.delete(consumerId);
        });

        // 清理传输
        const userTransports = [];
        for (const [transportId, transport] of this.transports) {
            if (transport.peerId === peerId) {
                userTransports.push(transportId);
            }
        }
        
        userTransports.forEach(transportId => {
            console.log('🚛 关闭传输:', transportId);
            const transport = this.transports.get(transportId);
            if (transport) {
                transport.close();
            }
            this.transports.delete(transportId);
        });

        console.log('✅ 用户媒体资源清理完成:', {
            peerId: peerId,
            remainingProducers: this.producers.size,
            remainingConsumers: this.consumers.size,
            remainingTransports: this.transports.size
        });
    }
}

export default MediaManager
