import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'http';
import cors from 'cors';

// 导入模块
import RoomManager from './managers/roomManager.js';
import MediaManager from './managers/mediaManager.js';
import WebSocketHandler from './handlers/websocketHandler.js';
import ApiRoutes from './routes/api.js';


class MediaSoupServer {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.wss = new WebSocketServer({ server: this.server });

        // 初始化管理器
        this.roomManager = new RoomManager();
        this.mediaManager = new MediaManager();

        
        // 初始化处理器
        this.webSocketHandler = new WebSocketHandler(
            this.roomManager, 
            this.mediaManager,
        );

        this.setupExpress();
        this.setupWebSocket();
    }

    /**
     * 设置Express中间件和路由
     */
    setupExpress() {
        this.app.use(cors());
        this.app.use(express.json());

        // 设置API路由
        const apiRoutes = new ApiRoutes(this.mediaManager, this.roomManager);
        this.app.use('/api', apiRoutes.getRouter());
    }

    /**
     * 设置WebSocket连接处理
     */
    setupWebSocket() {
        this.wss.on('connection', (ws) => {
            console.log('=== 新的WebSocket连接 ===');

            const peerId = this.roomManager.addPeer(ws);

            console.log('✅ 新用户连接:', {
                peerId: peerId,
                totalPeers: this.roomManager.peers.size
            });

            ws.on('message', async (message) => {
                try {
                    const data = JSON.parse(message);
                    await this.webSocketHandler.handleMessage(peerId, data);
                } catch (error) {
                    console.error('❌ 处理WebSocket消息失败:', error);
                    console.error('原始消息:', message.toString());
                    ws.send(JSON.stringify({ type: 'error', message: error.message }));
                }
            });

            ws.on('close', () => {
                console.log('🔌 WebSocket连接关闭:', {
                    peerId: peerId,
                    remainingPeers: this.roomManager.peers.size - 1
                });
                this.webSocketHandler.handleDisconnect(peerId);
            });

            // 发送连接确认
            const confirmMessage = {
                type: 'connected',
                peerId: peerId
            };
            console.log('📤 发送连接确认:', confirmMessage);
            ws.send(JSON.stringify(confirmMessage));
        });
    }

    /**
     * 初始化MediaSoup服务器
     */
    async init() {
        await this.mediaManager.init();
    }

    /**
     * 启动服务器
     */
    start(port = 3001) {
        this.server.listen(port, '0.0.0.0', () => {
            console.log(`MediaSoup服务器运行在端口 ${port}`);
        });
    }
}

// 启动服务器
const server = new MediaSoupServer();
server.init().then(() => {
    server.start();
});


export default MediaSoupServer
