class WebSocketHandler {
    constructor(roomManager, mediaManager) {
        this.roomManager = roomManager;
        this.mediaManager = mediaManager;

    }

    /**
     * 处理WebSocket消息
     */
    async handleMessage(peerId, data) {
        const peer = this.roomManager.getPeer(peerId);
        if (!peer) return;

        console.log('📨 收到WebSocket消息:', {
            peerId: peerId,
            type: data.type,
            data: data
        });

        switch (data.type) {
            case 'joinRoom':
                await this.handleJoinRoom(peerId, data);
                break;
            case 'leaveRoom':
                await this.handleLeaveRoom(peerId, data);
                break;
            case 'sendMessage':
                await this.handleSendMessage(peerId, data);
                break;
            case 'muteUser':
                await this.handleMuteUser(peerId, data);
                break;
            case 'switchMainVideo':
                await this.handleSwitchMainVideo(peerId, data);
                break;
            default:
                console.log('未知消息类型:', data.type);
        }
    }

    /**
     * 处理加入房间
     */
    async handleJoinRoom(peerId, data) {
        // 兼容前端传 id 或 roomId
        const roomId = data.roomId || data.id;
        const isCreator = data.isCreator;

        console.log('=== 用户加入房间 ===');
        console.log('peerId:', peerId);
        console.log('roomId:', roomId);
        console.log('isCreator:', isCreator);

        const room = this.roomManager.joinRoom(peerId, roomId, isCreator);
        const peer = this.roomManager.getPeer(peerId);

        console.log('✅ 用户成功加入房间:', {
            peerId: peerId,
            roomId: roomId,
            isCreator: isCreator,
            roomSize: room.peers.size,
            roomCreator: room.creator
        });

        // 通知房间内其他用户
        const notificationMessage = {
            type: 'userJoined',
            peerId: peerId,
            isCreator: isCreator
        };
        console.log('📢 广播用户加入消息:', notificationMessage);
        this.roomManager.broadcastToRoom(roomId, notificationMessage, peerId);

        // 发送房间信息给新用户
        const roomInfo = {
            type: 'roomJoined',
            roomId: roomId,
            isCreator: isCreator,
            peers: this.roomManager.getRoomPeers(roomId, peerId)
        };
        console.log('📤 发送房间信息给新用户:', roomInfo);
        peer.ws.send(JSON.stringify(roomInfo));

        // 主动推送房间内所有已有生产者给新用户
        const roomProducers = this.mediaManager.getProducersByRoom(roomId);
        roomProducers.forEach(({ producerId, producer, peerId: producerPeerId, appData }) => {
            if (producerPeerId !== peerId) {
                const newProducerMsg = {
                    type: 'newProducer',
                    producerId,
                    peerId: producerPeerId,
                    appData: producer.appData,
                    kind: producer.kind
                };
                console.log('📤 主动推送已有生产者给新用户:', newProducerMsg);
                peer.ws.send(JSON.stringify(newProducerMsg));
            }
        });
    }

    /**
     * 处理离开房间
     */
    async handleLeaveRoom(peerId, data) {
        const peer = this.roomManager.getPeer(peerId);
        if (!peer || !peer.roomId) return;

        const roomId = peer.roomId;
        const room = this.roomManager.leaveRoom(peerId);

        if (room) {
            // 通知房间内其他用户
            this.roomManager.broadcastToRoom(roomId, {
                type: 'userLeft',
                peerId: peerId
            }, peerId);
        }
    }

    /**
     * 处理发送消息
     */
    async handleSendMessage(peerId, data) {
        const peer = this.roomManager.getPeer(peerId);
        if (!peer || !peer.roomId) return;

        const room = this.roomManager.getRoom(peer.roomId);
        if (!room) return;

        // 检查是否被禁言
        if (room.muteAll && !peer.isCreator) {
            peer.ws.send(JSON.stringify({
                type: 'error',
                message: '您已被禁言'
            }));
            return;
        }

        const message = {
            id: this.roomManager.generateId(),
            peerId: peerId,
            content: data.content,
            timestamp: new Date().toISOString(),
            isCreator: peer.isCreator
        };

        this.roomManager.addMessage(peer.roomId, message);

        // 广播消息到房间内所有用户
        this.roomManager.broadcastToRoom(peer.roomId, {
            type: 'newMessage',
            message: message
        });
    }

    /**
     * 处理禁言用户
     */
    async handleMuteUser(peerId, data) {
        const peer = this.roomManager.getPeer(peerId);
        if (!peer || !peer.isCreator || !peer.roomId) return;

        this.roomManager.setRoomMute(peer.roomId, data.mute);

        // 通知房间内所有用户
        this.roomManager.broadcastToRoom(peer.roomId, {
            type: 'muteStatusChanged',
            muteAll: data.mute
        });
    }

    /**
     * 处理切换主视频
     */
    async handleSwitchMainVideo(peerId, data) {
        const peer = this.roomManager.getPeer(peerId);
        if (!peer || !peer.isCreator || !peer.roomId) {
            console.log('❌ 主视频切换权限检查失败:', {
                peerExists: !!peer,
                isCreator: peer?.isCreator,
                hasRoom: !!peer?.roomId
            });
            return;
        }

        console.log('=== 处理主视频切换请求 ===');
        console.log('请求来自:', peerId);
        console.log('房间ID:', peer.roomId);
        console.log('切换数据:', data);

        // 支持新的流ID切换格式和旧的producerId格式
        const broadcastData = {
            type: 'mainVideoChanged',
            ...(data.mainStreamId && data.secondaryStreamId ? {
                mainStreamId: data.mainStreamId,
                secondaryStreamId: data.secondaryStreamId
            } : {}),
            ...(data.producerId ? { producerId: data.producerId } : {})
        };

        // 更新房间状态（为了兼容性保留producerId）
        if (data.producerId) {
            this.roomManager.setMainVideoProducer(peer.roomId, data.producerId);
        }

        console.log('📢 广播主视频切换通知:', broadcastData);
        // 通知房间内所有用户（不包括发起者，因为发起者已经在本地切换了）
        this.roomManager.broadcastToRoom(peer.roomId, broadcastData, peerId);
        
        console.log('✅ 主视频切换处理完成');
    }

    /**
     * 处理用户断开连接
     */
    handleDisconnect(peerId) {
        console.log('=== 处理用户断开连接 ===');
        console.log('断开用户:', peerId);
        
        const peer = this.roomManager.getPeer(peerId);
        if (!peer) {
            console.log('⚠️ 用户已不存在于连接列表中');
            return;
        }

        // 通知房间内其他用户
        if (peer.roomId) {
            this.roomManager.broadcastToRoom(peer.roomId, {
                type: 'userLeft',
                peerId: peerId
            }, peerId);
        }

        // 清理媒体资源
        this.mediaManager.cleanupPeerResources(peerId);

        // 从房间管理器中移除用户
        this.roomManager.removePeer(peerId);
        
        console.log('✅ 用户断开连接处理完成');
    }
}

export default WebSocketHandler
