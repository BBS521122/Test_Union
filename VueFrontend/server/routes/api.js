import express from 'express';

class ApiRoutes {
    constructor(mediaManager, roomManager) {
        this.router = express.Router();
        this.mediaManager = mediaManager;
        this.roomManager = roomManager;
        this.setupRoutes();
    }

    setupRoutes() {
        // 获取会议信息（模拟Spring Boot接口）
        this.router.get('/meeting/:meetingId', (req, res) => {
            const meetingId = req.params.meetingId;
            // 模拟会议数据
            const meetingData = {
                id: meetingId,
                title: '视频会议',
                startTime: new Date().toISOString(),
                duration: 60, // 分钟
                creator: 'admin',
                status: 'active'
            };
            res.json(meetingData);
        });

        // 获取RTP能力
        this.router.get('/rtpCapabilities', (req, res) => {
            try {
                const rtpCapabilities = this.mediaManager.getRtpCapabilities();
                res.json(rtpCapabilities);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // 创建WebRTC传输
        this.router.post('/createWebRtcTransport', async (req, res) => {
            try {
                const { consuming, producing, peerId } = req.body;
                console.log('=== 创建WebRTC传输请求 ===');
                console.log('consuming:', consuming);
                console.log('producing:', producing);
                console.log('peerId from request:', peerId);
                
                const transport = await this.mediaManager.createWebRtcTransport(peerId);
                
                console.log('✅ WebRTC传输创建成功:', {
                    transportId: transport.id,
                    peerId: peerId,
                    consuming: consuming,
                    producing: producing
                });

                res.json({
                    id: transport.id,
                    iceParameters: transport.iceParameters,
                    iceCandidates: transport.iceCandidates,
                    dtlsParameters: transport.dtlsParameters
                });
            } catch (error) {
                console.error('❌ 创建WebRTC传输失败:', error);
                console.error('错误堆栈:', error.stack);
                res.status(500).json({ error: error.message });
            }
        });

        // 连接传输
        this.router.post('/connectTransport', async (req, res) => {
            try {
                const { transportId, dtlsParameters } = req.body;
                await this.mediaManager.connectTransport(transportId, dtlsParameters);
                res.json({ success: true });
            } catch (error) {
                console.error('连接传输失败:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // 创建生产者
        this.router.post('/produce', async (req, res) => {
            try {
                const { transportId, kind, rtpParameters, appData } = req.body;
                console.log('=== 创建生产者请求 ===');
                console.log('transportId:', transportId);
                console.log('kind:', kind);
                console.log('appData:', appData);
                console.log('rtpParameters keys:', Object.keys(rtpParameters || {}));
                
                // 获取 peerId 和 roomId
                const peerId = this.mediaManager.findPeerByTransport(transportId);
                if (!peerId) {
                    console.error('❌ 未找到transport对应的peer');
                    return res.status(404).json({ error: 'Peer not found for transport' });
                }

                // 从roomManager获取peer的roomId
                const peer = this.roomManager.getPeer(peerId);
                const roomId = peer ? peer.roomId : null;

                const producer = await this.mediaManager.createProducer(
                    transportId, kind, rtpParameters, appData, peerId, roomId
                );

                console.log('✅ Producer created successfully:', {
                    id: producer.id,
                    kind: producer.kind,
                    type: producer.type,
                    paused: producer.paused,
                    appData: producer.appData
                });

                // 通知房间内其他用户有新的生产者
                if (peerId && roomId) {
                    console.log('📢 广播新生产者到房间:', roomId);
                    console.log('生产者详情:', {
                        producerId: producer.id,
                        peerId: peerId,
                        appData: appData,
                        kind: kind
                    });
                    
                    this.roomManager.broadcastToRoom(roomId, {
                        type: 'newProducer',
                        producerId: producer.id,
                        peerId: peerId,
                        appData: appData,
                        kind: kind
                    }, peerId);
                    
                    const room = this.roomManager.getRoom(roomId);
                    console.log('📢 广播完成，房间内用户数:', room?.peers.size || 0);
                } else {
                    console.warn('⚠️ 未找到生产者对应的peer或房间');
                }

                res.json({ id: producer.id });
            } catch (error) {
                console.error('❌ 创建生产者失败:', error);
                console.error('错误堆栈:', error.stack);
                res.status(500).json({ error: error.message });
            }
        });

        // 创建消费者
        this.router.post('/consume', async (req, res) => {
            try {
                const { transportId, producerId, rtpCapabilities } = req.body;
                console.log('=== 创建消费者请求 ===');
                console.log('transportId:', transportId);
                console.log('producerId:', producerId);
                console.log('rtpCapabilities keys:', Object.keys(rtpCapabilities || {}));
                
                const { consumer, producerInfo } = await this.mediaManager.createConsumer(
                    transportId, producerId, rtpCapabilities
                );
                
                console.log('✅ Consumer created successfully:', {
                    id: consumer.id,
                    producerId: consumer.producerId,
                    kind: consumer.kind,
                    type: consumer.type,
                    paused: consumer.paused,
                    producerPaused: consumer.producerPaused,
                    appData: consumer.appData
                });

                const response = {
                    id: consumer.id,
                    producerId,
                    kind: consumer.kind,
                    rtpParameters: consumer.rtpParameters,
                    appData: consumer.appData
                };
                
                console.log('📤 返回消费者数据:', {
                    id: response.id,
                    producerId: response.producerId,
                    kind: response.kind,
                    rtpParametersKeys: Object.keys(response.rtpParameters || {}),
                    appData: response.appData
                });

                res.json(response);
            } catch (error) {
                console.error('❌ 创建消费者失败:', error);
                console.error('错误堆栈:', error.stack);
                res.status(500).json({ error: error.message });
            }
        });

        // 恢复消费者
        this.router.post('/resumeConsumer', async (req, res) => {
            try {
                const { consumerId } = req.body;
                console.log('=== 恢复消费者请求 ===');
                console.log('consumerId:', consumerId);
                
                await this.mediaManager.resumeConsumer(consumerId);
                
                console.log('✅ Consumer resumed successfully');
                res.json({ success: true });
            } catch (error) {
                console.error('❌ 恢复消费者失败:', error);
                console.error('错误堆栈:', error.stack);
                res.status(500).json({ error: error.message });
            }
        });
    }

    getRouter() {
        return this.router;
    }
}

export default ApiRoutes;