import WebSocket from "ws";

class RoomManager {
    constructor() {
        this.rooms = new Map(); // 房间管理
        this.peers = new Map(); // 用户连接管理
    }

    /**
     * 生成唯一ID
     */
    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    /**
     * 添加新的用户连接
     */
    addPeer(ws) {
        const peerId = this.generateId();
        this.peers.set(peerId, {
            id: peerId,
            ws: ws,
            roomId: null,
            isCreator: false,
            isMuted: false
        });
        return peerId;
    }

    /**
     * 获取用户信息
     */
    getPeer(peerId) {
        return this.peers.get(peerId);
    }

    /**
     * 删除用户
     */
    removePeer(peerId) {
        const peer = this.peers.get(peerId);
        if (peer && peer.roomId) {
            this.leaveRoom(peerId);
        }
        this.peers.delete(peerId);
    }

    /**
     * 用户加入房间
     */
    joinRoom(peerId, roomId, isCreator = false) {
        const peer = this.peers.get(peerId);
        if (!peer) return null;

        // 创建房间（如果不存在）
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, {
                id: roomId,
                creator: null,
                peers: new Set(),
                messages: [],
                muteAll: false,
                mainVideoProducer: null
            });
        }

        const room = this.rooms.get(roomId);
        room.peers.add(peerId);
        peer.roomId = roomId;
        peer.isCreator = isCreator;

        if (isCreator && !room.creator) {
            room.creator = peerId;
        }

        return room;
    }

    /**
     * 用户离开房间
     */
    leaveRoom(peerId) {
        const peer = this.peers.get(peerId);
        if (!peer || !peer.roomId) return;

        const room = this.rooms.get(peer.roomId);
        if (room) {
            room.peers.delete(peerId);

            // 如果房间为空，删除房间
            if (room.peers.size === 0) {
                this.rooms.delete(peer.roomId);
            }
        }

        peer.roomId = null;
        peer.isCreator = false;
        return room;
    }

    /**
     * 获取房间信息
     */
    getRoom(roomId) {
        return this.rooms.get(roomId);
    }

    /**
     * 向房间内广播消息
     */
    broadcastToRoom(roomId, message, excludePeerId = null) {
        const room = this.rooms.get(roomId);
        if (!room) {
            console.warn('⚠️ 尝试广播到不存在的房间:', roomId);
            return;
        }

        console.log('=== 房间广播 ===');
        console.log('roomId:', roomId);
        console.log('message type:', message.type);
        console.log('excludePeerId:', excludePeerId);
        console.log('房间内用户数:', room.peers.size);

        let broadcastCount = 0;
        const disconnectedPeers = [];
        
        room.peers.forEach(peerId => {
            if (peerId !== excludePeerId) {
                const peer = this.peers.get(peerId);
                if (peer && peer.ws.readyState === WebSocket.OPEN) {
                    console.log('📤 发送消息给用户:', {
                        peerId: peerId,
                        isCreator: peer.isCreator,
                        messageType: message.type
                    });
                    peer.ws.send(JSON.stringify(message));
                    broadcastCount++;
                } else {
                    console.warn('⚠️ 用户连接已断开或不可用:', peerId);
                    disconnectedPeers.push(peerId);
                }
            }
        });
        
        // 清理断开连接的用户
        disconnectedPeers.forEach(peerId => {
            console.log('🧹 清理断开连接的用户:', peerId);
            this.removePeer(peerId);
        });
        
        console.log('📊 广播完成，成功发送数:', broadcastCount);
    }

    /**
     * 添加房间消息
     */
    addMessage(roomId, message) {
        const room = this.rooms.get(roomId);
        if (room) {
            room.messages.push(message);
        }
    }

    /**
     * 设置房间禁言状态
     */
    setRoomMute(roomId, muteAll) {
        const room = this.rooms.get(roomId);
        if (room) {
            room.muteAll = muteAll;
        }
    }

    /**
     * 设置主视频生产者
     */
    setMainVideoProducer(roomId, producerId) {
        const room = this.rooms.get(roomId);
        if (room) {
            room.mainVideoProducer = producerId;
        }
    }

    /**
     * 获取房间内所有用户（除了指定用户）
     */
    getRoomPeers(roomId, excludePeerId = null) {
        const room = this.rooms.get(roomId);
        if (!room) return [];
        
        return Array.from(room.peers).filter(peerId => peerId !== excludePeerId);
    }
}

export default RoomManager
