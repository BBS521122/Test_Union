<template>
  <div class="meeting-container">
    <!-- 视频区域 -->
    <div class="video-area">
      <div v-if="mainVideoStream" class="main-video">
        <video
            ref="mainVideoRef"
            :srcObject="mainVideoStream"
            autoplay
            playsinline
            class="main-video-element"
            @loadstart="() => console.log('📺 主视频开始加载')"
            @loadedmetadata="() => console.log('📺 主视频元数据已加载')"
            @loadeddata="() => console.log('📺 主视频数据已加载')"
            @canplay="() => console.log('📺 主视频可以播放')"
            @playing="() => console.log('📺 主视频正在播放')"
            @waiting="() => console.log('📺 主视频等待数据')"
            @error="(e) => console.error('📺 主视频错误:', e)"
        ></video>
        <!-- 辅助视频移到主视频内部右上角 -->
        <div v-if="shouldShowSecondaryVideo" class="secondary-video-inside">
          <video
              ref="secondaryVideoRef"
              :srcObject="secondaryVideoStream"
              autoplay
              class="secondary-video-element"
              @click="isCreator ? switchMainVideo : null"
          ></video>
          <div
              v-if="isCreator"
              class="switch-button"
              @click="switchMainVideo"
              title="切换主辅视频"
          >
            <img src="../assets/icons/cached.svg" width="20" height="20" alt="切换主辅视频"/>
          </div>
          <div v-else class="viewer-indicator" title="观看者模式">
            <img src="../assets/icons/visibility.svg" width="16" height="16" alt="观看者" style="opacity:0.6;"/>
          </div>
        </div>
      </div>
      <div v-else class="no-video">
        暂无视频流信息
      </div>
    </div>

    <!-- 控制栏 -->
    <div class="control-bar">
      <div class="control-group">
        <!-- 摄像头控制 -->
        <button
            v-if="isCreator"
            @click="toggleCamera"
            :class="['control-button', { active: isCameraOn }]"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path v-if="isCameraOn"
                  d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
            <path v-else
                  d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82l-2-2H16c.55 0 1 .45 1 1v3.5l4-4v11l-1.43-1.43L21 6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z"/>
          </svg>
          {{ isCameraOn ? '关闭摄像头' : '开启摄像头' }}
        </button>

        <!-- 屏幕共享控制 -->
        <button
            v-if="isCreator"
            @click="toggleScreenShare"
            :class="['control-button', { active: isScreenSharing }]"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path
                d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/>
          </svg>
          {{ isScreenSharing ? '停止共享' : '共享屏幕' }}
        </button>

        <!-- 画中画控制 -->
        <button
            v-if="mainVideoStream && isPictureInPictureSupported"
            @click="togglePictureInPicture"
            :class="['control-button', { active: isPictureInPictureActive }]"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path
                d="M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14z"/>
          </svg>
          {{ isPictureInPictureActive ? '退出画中画' : '画中画' }}
        </button>

        <!-- 扩展录制状态显示（只显示状态，不可点击） -->
        <div
            v-if="isCreator && isExtensionRecording"
            class="control-button recording-status"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
          </svg>
          录制中... {{ formatRecordingDuration(recordingDuration) }}
        </div>

      </div>

      <div class="control-group">
        <!-- 离开会议 -->
        <button @click="leaveMeeting" class="control-button leave">
          离开会议
        </button>
      </div>
    </div>

    <!-- 扩展激活提示对话框 -->
    <div v-if="showExtensionDialog" class="extension-dialog-overlay" @click="closeExtensionDialog">
      <div class="extension-dialog" @click.stop>
        <div class="dialog-header">
          <h3>录制权限设置</h3>
          <button class="close-button" @click="closeExtensionDialog">×</button>
        </div>
        <div class="dialog-content">
          <div class="dialog-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="#ff8800">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <div class="dialog-text">
            <p><strong>录制需要用户手势和权限</strong></p>
            <p>自动录制失败，可能原因：缺少用户手势、浏览器权限限制等。请按照以下步骤手动启动：</p>
            <ol>
              <li><strong>点击浏览器工具栏中的扩展图标 🧩</strong></li>
              <li>找到并点击 <strong>"MediaSoup Tab Recorder"</strong> 扩展图标</li>
              <li>在扩展弹窗中点击<strong>"开始录制"</strong>按钮</li>
              <li>如果提示权限问题，点击地址栏中的摄像头图标📹并选择<strong>"允许"</strong></li>
              <li>完成手动录制后，可点击下方"重试录制"按钮测试自动录制</li>
            </ol>
            <p style="color: #ff8800; font-size: 14px;">💡 提示：Chrome/Edge 要求录制必须在用户手势（如点击）上下文中发起，自动录制可能受限。</p>
          </div>
        </div>
        <div class="dialog-actions">
          <button
              class="retry-button"
              @click="retryRecording"
              :disabled="isRetryingRecording"
          >
            {{ isRetryingRecording ? '重试中...' : '重试录制' }}
          </button>
          <button 
              class="reset-button" 
              @click="resetExtension"
              :disabled="isResettingExtension"
          >
            {{ isResettingExtension ? '重置中...' : '重置扩展' }}
          </button>
          <button class="cancel-button" @click="closeExtensionDialog">
            稍后再试
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import {ref, reactive, onMounted, onUnmounted, nextTick, watch, computed} from 'vue';
import MediaSoupClientService from '../MediaSoupClient.ts';
import {ElMessageBox, ElMessage} from 'element-plus'
import router from "@/router/index.js";

export default {
  name: 'MeetingRoom',
  props: {
    id: {
      type: String,
      required: true
    },
    role: {
      type: String,
      required: true
    },
    serverUrl: {
      type: String,
      default: 'http://localhost:3001'
    }
  },
  emits: ['leave'],
  setup(props, {emit}) {
    // 统一日志系统 - 发送到background.js
    const unifiedLogger = {
      log: (level, message, data) => {
        // 本地控制台输出
        console[level](`[MeetingRoom] ${message}`, data || '');
        
        // 发送到background.js（如果扩展可用）
        if ((window).chrome?.runtime?.sendMessage) {
          try {
            (window).chrome.runtime.sendMessage({
              type: 'unified-log',
              target: 'background',
              data: {
                source: 'MeetingRoom',
                level: level,
                message: message,
                data: data,
                timestamp: new Date().toISOString(),
                url: window.location.href,
                roomId: props.id
              }
            }).catch(() => {
              // 静默处理发送失败
            });
          } catch (err) {
            // 静默处理发送失败
          }
        }
      },
      info: (message, data) => unifiedLogger.log('log', message, data),
      warn: (message, data) => unifiedLogger.log('warn', message, data),
      error: (message, data) => unifiedLogger.log('error', message, data)
    };

    // 响应式数据
    const mainVideoRef = ref(null);
    const secondaryVideoRef = ref();
    const chatMessagesRef = ref();
    const isCreator = ref(false);

    const mainVideoStream = ref(null);
    const secondaryVideoStream = ref(null);
    const isCameraOn = ref(false);
    const isScreenSharing = ref(false);
    const isExtensionRecording = ref(false);
    const recordingDuration = ref(0);
    const isMuteAll = ref(false);
    const isSending = ref(false);
    const isResettingExtension = ref(false);
    const isPictureInPictureSupported = ref(false);
    const isPictureInPictureActive = ref(false);
    const extensionAvailable = ref(false);

    // 扩展激活对话框相关
    const showExtensionDialog = ref(false);
    const isRetryingRecording = ref(false);


    const messages = reactive([]);
    const newMessage = ref('');
    const meetingTitle = ref('视频会议');

    // MediaSoup客户端
    let mediaSoupClient;
    let cameraStream = null;
    let screenStream = null;
    let cameraMonitorInterval = null; // 摄像头监控定时器
    let recordingTimerInterval = null; // 录制时长计时器

    // 计算属性：是否应该显示辅助视频
    const shouldShowSecondaryVideo = computed(() => {
      // 只有当摄像头和屏幕共享同时存在时才显示辅助视频
      return isCameraOn.value && isScreenSharing.value && secondaryVideoStream.value;
    });

    // 监控摄像头状态，防止意外关闭
    function monitorCameraState() {
      if (!isCreator.value || cameraMonitorInterval) return;

      console.log('📹 启动摄像头状态监控');
      cameraMonitorInterval = setInterval(() => {
        if (!isCreator.value) {
          clearInterval(cameraMonitorInterval);
          cameraMonitorInterval = null;
          return;
        }

        console.log('🔍 摄像头状态检查:', {
          isCameraOn: isCameraOn.value,
          hasCameraStream: !!cameraStream,
          cameraStreamActive: cameraStream?.active,
          cameraStreamTracks: cameraStream?.getTracks().length || 0,
          mainVideoStream: !!mainVideoStream.value,
          mainVideoActive: mainVideoStream.value?.active
        });

        // 只有在确实应该有摄像头但摄像头流异常时才修复
        if (isCameraOn.value && cameraStream && !cameraStream.active) {
          console.warn('⚠️ 检测到摄像头流已停止，尝试重新开启');
          isCameraOn.value = false;
          cameraStream = null; // 清空异常的流
          toggleCamera().catch(error => {
            console.error('自动修复摄像头失败:', error);
          });
        }
      }, 5000);
    }

    // 初始化
    onMounted(async () => {
      try {
        await initMeeting();
      } catch (error) {
        console.error('会议初始化失败:', error);
        alert('初始化会议失败: ' + (error.message || '未知错误'));
        emit('leave');
      }
    });

    // Setup user interaction listeners early in the component lifecycle
    onMounted(() => {
      // 添加用户交互监听器以启用音频播放
      const interactionEvents = ['click', 'touchstart', 'keydown', 'mousedown', 'pointerdown'];
      let interactionAttempts = 0;
      const maxAttempts = 3;

      const userInteractionHandler = async () => {
        try {
          console.log('👆 检测到用户交互，尝试启用所有音频');
          await enableAllAudioElements();

          // 检查是否所有音频都在播放
          const audioElements = document.querySelectorAll('audio[id^="audio-"]');
          const allPlaying = Array.from(audioElements).every(audio =>
              !audio.paused && !audio.muted && audio.readyState >= 3
          );

          if (allPlaying) {
            console.log('✅ 所有音频元素已成功启用');
            // 移除事件监听器
            interactionEvents.forEach(event => {
              document.removeEventListener(event, userInteractionHandler);
            });
          } else {
            interactionAttempts++;
            if (interactionAttempts >= maxAttempts) {
              console.warn('⚠️ 达到最大尝试次数，提示用户刷新页面');
              ElMessage.warning({
                message: '音频启用遇到问题，请尝试刷新页面或检查浏览器设置。',
                duration: 0,
                showClose: true
              });
            }
          }
        } catch (error) {
          console.error('❌ 启用音频失败:', error);
        }
      };

      // 添加监听器
      interactionEvents.forEach(event => {
        document.addEventListener(event, userInteractionHandler);
      });

      // 在组件卸载时清理监听器
      onUnmounted(() => {
        interactionEvents.forEach(event => {
          document.removeEventListener(event, userInteractionHandler);
        });
      });
    });

    // 存储已连接的音频元素ID
    const connectedAudioElements = new Set();

    // 启用所有音频元素的辅助函数
    async function enableAllAudioElements() {
      const audioElements = document.querySelectorAll('audio[id^="audio-"]');
      console.log(`🔊 尝试启用 ${audioElements.length} 个音频元素`);

      for (const audioElement of audioElements) {
        try {
          // 如果音频元素已经在正常播放，跳过
          if (!audioElement.paused && !audioElement.muted) {
            console.log('✅ 音频已在正常播放中:', audioElement.id);
            continue;
          }

          // 重置音频元素状态
          audioElement.currentTime = 0;
          audioElement.volume = 1.0;

          // 只有未连接的音频元素需要创建新的连接
          if (!connectedAudioElements.has(audioElement.id)) {
            try {
              // 创建临时的AudioContext以解锁音频
              const tempContext = new (window.AudioContext || window.webkitAudioContext)();
              await tempContext.resume();
              const source = tempContext.createMediaElementSource(audioElement);
              source.connect(tempContext.destination);
              connectedAudioElements.add(audioElement.id);
              console.log('🔌 创建新的音频连接:', audioElement.id);
            } catch (connError) {
              console.log('⚠️ 音频连接已存在，继续播放:', audioElement.id);
            }
          }

          // 首先尝试以静音方式播放
          audioElement.muted = true;
          await audioElement.play();
          console.log('✅ 初始静音播放成功:', audioElement.id);

          // 等待一个稳定帧后取消静音
          await new Promise(resolve => requestAnimationFrame(resolve));
          audioElement.muted = false;
          console.log('✅ 成功取消静音:', audioElement.id);

        } catch (error) {
          console.warn('⚠️ 启用音频元素遇到问题:', audioElement.id, error);
          // 尝试直接播放
          try {
            audioElement.muted = false;
            await audioElement.play();
            console.log('✅ 直接播放成功:', audioElement.id);
          } catch (playError) {
            console.error('❌ 启用音频元素失败:', audioElement.id, playError);
            ElMessage.error({
              message: '音频启用失败，请检查浏览器设置或刷新页面重试',
              duration: 5000
            });
          }
        }
      }
    }

    // 清理
    onUnmounted(async () => {
      // 清理摄像头监控
      if (cameraMonitorInterval) {
        clearInterval(cameraMonitorInterval);
        cameraMonitorInterval = null;
      }

      // 清理录制定时器
      stopRecordingTimer();

      // 如果是创建者且正在录制，确保录制停止并保存
      if (isCreator.value && isExtensionRecording.value) {
        console.log('🔄 组件卸载，创建者自动停止录制...');
        try {
          await stopAutoRecording();
        } catch (error) {
          console.error('组件卸载时停止录制失败:', error);
        }
      }

      await cleanup();
    });

    // 初始化会议，在生命周期钩子中调用
    async function initMeeting() {
      mediaSoupClient = new MediaSoupClientService();

      // 设置事件监听器
      mediaSoupClient.setEventListeners({
        onNewConsumer: handleNewConsumer,
        onConsumerClosed: handleConsumerClosed,
        onNewMessage: handleNewMessage,
        onUserJoined: handleUserJoined,
        onUserLeft: handleUserLeft,
        onRecordingStarted: handleRecordingStarted,
        onRecordingStopped: handleRecordingStopped,
        onMuteStatusChanged: handleMuteStatusChanged,
        onMainVideoChanged: handleMainVideoChanged,
        onNeedUserGesture: showExtensionActivationDialog
      });

      isCreator.value = props.role === 'creator';
      // 连接到会议
      const config = {
        roomId: props.id,
        isCreator: isCreator.value,
        serverUrl: props.serverUrl
      };
      // TODO 根据id获取会议信息
      console.log("会议ID:", config.roomId);
      await mediaSoupClient.connect(config);
      await mediaSoupClient.handleCreatorVideo();

      // 异步检查扩展状态（不阻塞会议初始化）
      updateExtensionStatus().then(available => {
        if (available) {
          console.log('✅ 扩展检查完成，扩展可用');
        } else {
          console.warn('⚠️ 扩展检查完成，扩展不可用');
        }
      });

      // 如果是创建者，等待本地视频流设置完成，然后开始录制
      if (isCreator.value) {
        console.log('🎯 创建者模式：等待本地视频流设置');

        // 等待本地视频流设置完成
        let waitRetries = 0;
        while (waitRetries < 10 && !isCameraOn.value) {
          console.log(`⏳ 等待本地视频流设置 (第${waitRetries + 1}次)`);
          await new Promise(resolve => setTimeout(resolve, 500));
          waitRetries++;
        }

        console.log('📹 创建者视频状态:', {
          isCameraOn: isCameraOn.value,
          hasMainVideo: !!mainVideoStream.value,
          hasCameraStream: !!cameraStream,
          cameraStreamActive: cameraStream?.active,
          mainVideoStreamActive: mainVideoStream.value?.active
        });

        // 延迟开始录制，确保视频流完全稳定
        console.log('⏰ 延迟3秒后开始自动录制，确保视频流完全稳定');
        // 恢复自动录制功能
        setTimeout(async () => {
          console.log('🔴 准备开始自动录制，检查当前状态:', {
            isCameraOn: isCameraOn.value,
            hasMainVideo: !!mainVideoStream.value,
            mainVideoId: mainVideoStream.value?.id,
            hasCameraStream: !!cameraStream,
            cameraStreamActive: cameraStream?.active,
            mainVideoStreamActive: mainVideoStream.value?.active
          });
          await startAutoRecording();
        }, 3000);
        
        console.log('📹 自动录制将在3秒后启动...');
      }

      // 确保所有视频流都正确绑定
      await nextTick();
      bindVideoStreams();

      // 启动摄像头状态监控（仅创建者）
      if (isCreator.value) {
        monitorCameraState();
      }
    }


    // 处理新消费者
    function handleNewConsumer(consumer, peerId) {
      console.log('=== 处理新消费者 ===');
      console.log('消费者信息:', {
        id: consumer.id,
        kind: consumer.kind,
        appData: consumer.appData,
        track: !!consumer.track,
        trackId: consumer.track?.id,
        trackEnabled: consumer.track?.enabled,
        trackReadyState: consumer.track?.readyState,
        isLocal: consumer.appData?.isLocal
      });
      console.log('来自用户:', peerId);

      // 处理音频流
      if (consumer.kind === 'audio' || consumer.appData?.type === 'creator-audio') {
        console.log('🎤 处理音频流');


        const audioStream = new MediaStream([consumer.track]);

        // 创建音频元素并播放
        const audioElement = document.createElement('audio');
        // 设置音频属性
        audioElement.srcObject = audioStream;
        audioElement.playsInline = true; // 支持iOS内联播放
        audioElement.controls = false;
        audioElement.volume = 1.0;
        audioElement.muted = true; // 初始静音，稍后通过enableAllAudioElements解除
        // 禁用默认的自动播放，我们将通过enableAllAudioElements控制播放
        audioElement.autoplay = false;

        // 添加唯一ID用于管理
        audioElement.id = `audio-${consumer.id}`;
        audioElement.setAttribute('data-peer-id', peerId);
        audioElement.setAttribute('data-consumer-id', consumer.id);

        // 添加到DOM中（但不可见）
        audioElement.style.display = 'none';
        document.body.appendChild(audioElement);

        console.log('✅ 音频流已设置并开始播放:', {
          audioElementId: audioElement.id,
          audioStreamId: audioStream.id,
          audioTracks: audioStream.getAudioTracks().length,
          trackId: consumer.track.id,
          peerId: peerId,
          isLocal: consumer.appData?.isLocal
        });

        // 监听音频播放事件
        audioElement.addEventListener('loadeddata', () => {
          console.log('🎵 音频数据加载完成:', audioElement.id);
        });

        audioElement.addEventListener('play', () => {
          console.log('▶️ 音频开始播放:', audioElement.id);
        });

        audioElement.addEventListener('error', (e) => {
          console.error('❌ 音频播放错误:', audioElement.id, e);
        });

        // 新的音频播放策略：主动请求用户交互
        const playAudio = async () => {
          try {
            // 直接尝试播放（不静音）
            await audioElement.play();
            console.log('✅ 音频播放成功:', audioElement.id);
          } catch (error) {
            if (error.name === 'NotAllowedError') {
              console.log('⚠️ 需要用户交互来启用音频');

              // 显示确认对话框，询问用户是否要启用音频
              try {
                await ElMessageBox.confirm(
                    '需要您的同意来启用音频功能。点击"确定"开启音频。',
                    '启用音频',
                    {
                      confirmButtonText: '确定',
                      cancelButtonText: '取消',
                      type: 'info',
                      showClose: false,
                      closeOnClickModal: false,
                      closeOnPressEscape: false
                    }
                );

                // 用户点击了确定，尝试播放
                await audioElement.play();
                console.log('✅ 用户同意后音频播放成功:', audioElement.id);
                ElMessage.success('音频已启用');

              } catch (dialogError) {
                // 用户点击了取消或关闭对话框
                console.log('❌ 用户拒绝了音频播放权限');
                ElMessage.warning({
                  message: '您已取消音频播放，将听不到其他参会者的声音。如需重新启用，请刷新页面。',
                  duration: 5000
                });
              }
            } else {
              // 其他类型的错误
              console.error('❌ 音频播放失败:', error);
              ElMessage.error({
                message: '音频播放失败，请检查浏览器设置和设备权限',
                duration: 5000
              });
            }
          }
        };

        // 开始播放尝试
        playAudio();

        return; // 音频处理完成，直接返回
      }

      const stream = new MediaStream([consumer.track]);
      console.log('创建的视频流:', {
        id: stream.id,
        active: stream.active,
        trackCount: stream.getTracks().length,
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length
      });

      console.log('当前主视频流状态:', {
        hasMainVideo: !!mainVideoStream.value,
        mainVideoId: mainVideoStream.value?.id,
        isCreator: isCreator.value
      });

      // 处理创建者本地视频（优先级最高）
      if (consumer.appData?.isLocal && isCreator.value) {
        console.log('👑 识别为创建者本地视频流');
        cameraStream = stream; // 保存摄像头流引用
        isCameraOn.value = true; // 设置摄像头状态为开启

        // 创建者本地视频始终设为主视频（除非有屏幕共享）
        if (!isScreenSharing.value) {
          console.log('📺 创建者本地视频设为主视频流');
          mainVideoStream.value = stream;
          secondaryVideoStream.value = null;
        } else {
          console.log('📹 创建者本地视频设为辅助视频流（有屏幕共享）');
          secondaryVideoStream.value = stream;
        }

      } else if (consumer.appData?.type === 'camera' || consumer.appData?.type === 'creator-video') {
        console.log('🎥 识别为其他用户的摄像头或创建者视频流');

        // 对于非创建者，或者创建者没有本地视频时，才设置其他用户的视频
        if (!isCreator.value || (!cameraStream && !mainVideoStream.value)) {
          cameraStream = stream; // 保存摄像头流引用

          // 如果没有屏幕共享，摄像头设为主视频
          if (!isScreenSharing.value) {
            console.log('📺 其他用户视频设为主视频流（无屏幕共享）');
            mainVideoStream.value = stream;
            secondaryVideoStream.value = null;
          } else {
            // 如果有屏幕共享，摄像头设为辅助视频
            console.log('📹 其他用户视频设为辅助视频流（有屏幕共享）');
            secondaryVideoStream.value = stream;
          }
          isCameraOn.value = true;
        } else {
          console.log('⚠️ 创建者已有本地视频，跳过其他用户视频');
        }

      } else if (consumer.appData?.type === 'screen') {
        console.log('🖥️ 识别为屏幕共享流');
        screenStream = stream; // 保存屏幕共享流引用

        // 屏幕共享始终为主视频
        console.log('📺 屏幕共享设为主视频流');
        mainVideoStream.value = stream;

        // 如果有摄像头，设为辅助视频
        if (isCameraOn.value && cameraStream) {
          console.log('📹 摄像头移至辅助视频位置');
          secondaryVideoStream.value = cameraStream;
        } else {
          secondaryVideoStream.value = null;
        }
        isScreenSharing.value = true;
      } else {
        console.warn('⚠️ 未知的流类型:', consumer.appData?.type);
      }

      console.log('=== 处理完成后的状态 ===');
      console.log('主视频流:', {
        exists: !!mainVideoStream.value,
        id: mainVideoStream.value?.id,
        active: mainVideoStream.value?.active,
        trackCount: mainVideoStream.value?.getTracks().length
      });
      console.log('辅助视频流:', {
        exists: !!secondaryVideoStream.value,
        id: secondaryVideoStream.value?.id,
        active: secondaryVideoStream.value?.active,
        trackCount: secondaryVideoStream.value?.getTracks().length
      });

      // 确保视频流正确绑定到DOM
      nextTick(() => {
        bindVideoStreams();
      });
    }

    // 处理消费者关闭
    function handleConsumerClosed(consumerId) {
      console.log('消费者关闭:', consumerId);

      // 清理对应的音频元素
      const audioElement = document.getElementById(`audio-${consumerId}`);
      if (audioElement) {
        console.log('🗑️ 清理音频元素:', audioElement.id);
        audioElement.pause();
        audioElement.srcObject = null;
        audioElement.remove();
      }
    }

// 处理新消息
    function handleNewMessage(message) {
      messages.push(message);
      nextTick(() => {
        if (chatMessagesRef.value) {
          chatMessagesRef.value.scrollTop = chatMessagesRef.value.scrollHeight;
        }
      });
    }

// 处理用户加入
    function handleUserJoined(peerId, isCreator) {
      console.log('用户加入:', peerId, isCreator);
    }

// 处理用户离开
    function handleUserLeft(peerId) {
      console.log('用户离开:', peerId);
    }

// 处理录制开始
    function handleRecordingStarted(data) {
      isExtensionRecording.value = true;
      console.log('🔴 扩展录制开始:', data);

      // 开始录制时长计时器
      startRecordingTimer();

      // 可以在这里添加用户提示
      if (data.method === 'extension') {
        console.log('📹 扩展录制已开始');
      }
    }

// 处理录制停止
    function handleRecordingStopped(data) {
      isExtensionRecording.value = false;
      console.log('⏹️ 扩展录制停止:', data);

      // 停止录制时长计时器
      stopRecordingTimer();

      // 可以在这里添加用户提示
      if (data.method === 'extension') {
        console.log('📹 扩展录制已停止，录制文件正在上传到服务器...');
      }
    }

// 处理禁言状态变化
    function handleMuteStatusChanged(muteAll) {
      isMuteAll.value = muteAll;
    }

// 处理主视频变化（接收来自创建者的切换通知）
    function handleMainVideoChanged(data) {
      console.log('=== 接收到主视频切换通知 ===');
      console.log('切换数据:', data);

      if (isCreator.value) {
        console.log('👑 创建者忽略自己发送的切换通知');
        return;
      }

      console.log('👥 非创建者执行主辅视频切换同步');
      console.log('同步前 - 主视频:', mainVideoStream.value?.id);
      console.log('同步前 - 辅助视频:', secondaryVideoStream.value?.id);

      // 如果数据包含具体的流ID，则按照指定同步
      if (data.mainStreamId && data.secondaryStreamId) {
        // 查找对应的流对象
        const streams = [mainVideoStream.value, secondaryVideoStream.value].filter(Boolean);
        const newMainStream = streams.find(stream => stream.id === data.mainStreamId);
        const newSecondaryStream = streams.find(stream => stream.id === data.secondaryStreamId);

        if (newMainStream && newSecondaryStream) {
          mainVideoStream.value = newMainStream;
          secondaryVideoStream.value = newSecondaryStream;
          console.log('✅ 按流ID同步完成');
        } else {
          console.log('⚠️ 未找到对应的流，执行简单切换');
          // 如果找不到对应流，则执行简单的位置切换
          if (secondaryVideoStream.value) {
            const temp = mainVideoStream.value;
            mainVideoStream.value = secondaryVideoStream.value;
            secondaryVideoStream.value = temp;
          }
        }
      } else {
        // 兼容旧的切换方式，简单的位置切换
        console.log('📱 执行简单位置切换');
        if (secondaryVideoStream.value) {
          const temp = mainVideoStream.value;
          mainVideoStream.value = secondaryVideoStream.value;
          secondaryVideoStream.value = temp;
        }
      }

      console.log('同步后 - 主视频:', mainVideoStream.value?.id);
      console.log('同步后 - 辅助视频:', secondaryVideoStream.value?.id);
      console.log('✅ 主辅视频切换同步完成');
    }

// 切换摄像头
    async function toggleCamera() {
      try {
        if (isCameraOn.value) {
          // 关闭摄像头
          if (cameraStream) {
            console.log('🛑 关闭摄像头');

            // 关闭MediaSoup生产者
            if (mediaSoupClient) {
              console.log('🔄 关闭摄像头生产者');
              await mediaSoupClient.closeCameraProducers();
            }

            // 停止媒体轨道
            cameraStream.getTracks().forEach(track => {
              console.log('⏹️ 停止轨道:', track.kind);
              track.stop();
            });
            cameraStream = null;
          }
          isCameraOn.value = false;

          // 重新分配视频流
          if (isScreenSharing.value && screenStream) {
            // 如果有屏幕共享，屏幕共享变为主视频，无辅助视频
            console.log('📺 屏幕共享保持为主视频');
            mainVideoStream.value = screenStream;
            secondaryVideoStream.value = null;
          } else {
            // 没有任何视频流
            console.log('📺 清空所有视频流');
            mainVideoStream.value = null;
            secondaryVideoStream.value = null;
          }
        } else {
          // 开启摄像头
          console.log('📹 开启摄像头');

          // 检查摄像头权限
          try {
            const permissions = await navigator.permissions.query({name: 'camera'});
            console.log('📹 摄像头权限状态:', permissions.state);
          } catch (e) {
            console.log('📹 无法查询摄像头权限:', e.message);
          }

          const getUserMediaParams = {
            video: {
              width: {ideal: 1920},
              height: {ideal: 1080},
              frameRate: {ideal: 30}
            },
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          };
          console.log('📹 请求摄像头和麦克风权限, 参数:', getUserMediaParams);

          // 打印可用摄像头设备详细信息
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = devices.filter(d => d.kind === 'videoinput');
          console.log('可用摄像头设备:', videoInputs.map(d => ({label: d.label, deviceId: d.deviceId})));
          let lastError;
          // 1. 先尝试原始参数
          try {
            cameraStream = await navigator.mediaDevices.getUserMedia(getUserMediaParams);
            console.log('✅ getUserMedia(原始参数) 成功');
          } catch (e1) {
            console.warn('❌ getUserMedia(原始参数) 失败:', e1);
            lastError = e1;
            // 2. 尝试最简单参数 video: true
            try {
              cameraStream = await navigator.mediaDevices.getUserMedia({video: true, audio: true});
              console.log('✅ getUserMedia(video: true) 成功');
            } catch (e2) {
              console.warn('❌ getUserMedia(video: true) 失败:', e2);
              lastError = e2;
              // 3. 依次尝试每个 deviceId
              for (const device of videoInputs) {
                try {
                  console.log('尝试 deviceId:', device.deviceId, device.label);
                  cameraStream = await navigator.mediaDevices.getUserMedia({
                    video: {deviceId: {exact: device.deviceId}},
                    audio: true
                  });
                  console.log('✅ getUserMedia(deviceId) 成功:', device.deviceId);
                  break;
                } catch (e3) {
                  console.warn('❌ getUserMedia(deviceId) 失败:', device.deviceId, e3);
                  lastError = e3;
                }
              }
            }
          }
          if (!cameraStream) {
            throw lastError || new Error('无法获取摄像头流');
          }

          // 生产视频流
          const videoTrack = cameraStream.getVideoTracks()[0];
          const audioTrack = cameraStream.getAudioTracks()[0];

          if (videoTrack) {
            console.log('📹 创建摄像头视频生产者');
            console.log('视频轨道详情:', {
              id: videoTrack.id,
              kind: videoTrack.kind,
              enabled: videoTrack.enabled,
              readyState: videoTrack.readyState,
              muted: videoTrack.muted
            });
            await mediaSoupClient.produce(videoTrack, {type: 'camera'});
          }
          if (audioTrack) {
            console.log('🔊 创建音频生产者');
            console.log('音频轨道详情:', {
              id: audioTrack.id,
              kind: audioTrack.kind,
              enabled: audioTrack.enabled,
              readyState: audioTrack.readyState,
              muted: audioTrack.muted
            });
            await mediaSoupClient.produce(audioTrack, {type: 'audio'});
          }

          // 设置本地视频流
          // 如果没有屏幕共享，摄像头设为主视频
          if (!isScreenSharing.value) {
            console.log('📺 摄像头设为主视频（无屏幕共享）');
            mainVideoStream.value = cameraStream;
            secondaryVideoStream.value = null;
          } else {
            // 如果有屏幕共享，摄像头设为辅助视频
            console.log('📹 摄像头设为辅助视频（有屏幕共享）');
            secondaryVideoStream.value = cameraStream;
          }

          isCameraOn.value = true;

          console.log('✅ 摄像头开启完成，最终状态:', {
            isCameraOn: isCameraOn.value,
            mainVideoStream: !!mainVideoStream.value,
            secondaryVideoStream: !!secondaryVideoStream.value,
            cameraStreamActive: cameraStream.active
          });

          // 确保视频流正确绑定到DOM
          await nextTick();
          bindVideoStreams();
        }
      } catch (error) {
        // 增强错误日志
        console.error('切换摄像头失败:', error);
        if (error && typeof error === 'object') {
          console.error('[摄像头错误详情]', {
            name: error.name,
            message: error.message,
            stack: error.stack,
            toString: error.toString && error.toString(),
          });
        }
        isCameraOn.value = false; // 确保状态一致
        alert('摄像头操作失败: ' + (error && error.message ? error.message : error));
      }
    }

// 切换屏幕共享
    async function toggleScreenShare() {
      try {
        if (isScreenSharing.value) {
          // 停止屏幕共享
          if (screenStream) {
            console.log('🛑 停止屏幕共享');

            // 关闭MediaSoup生产者
            if (mediaSoupClient) {
              console.log('🔄 关闭屏幕共享生产者');
              await mediaSoupClient.closeScreenProducers();
            }

            // 停止媒体轨道
            screenStream.getTracks().forEach(track => {
              console.log('⏹️ 停止轨道:', track.kind);
              track.stop();
            });
            screenStream = null;
          }
          isScreenSharing.value = false;

          // 重新分配视频流
          if (isCameraOn.value && cameraStream) {
            // 如果有摄像头，摄像头变为主视频，无辅助视频
            console.log('📺 摄像头变为主视频');
            mainVideoStream.value = cameraStream;
            secondaryVideoStream.value = null;
          } else {
            // 没有任何视频流
            console.log('📺 清空所有视频流');
            mainVideoStream.value = null;
            secondaryVideoStream.value = null;
          }
        } else {
          // 开始屏幕共享
          console.log('🎬 开始屏幕共享');
          screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true
          });

          // 生产屏幕流
          const videoTrack = screenStream.getVideoTracks()[0];
          const audioTrack = screenStream.getAudioTracks()[0];

          if (videoTrack) {
            console.log('📹 创建屏幕视频生产者');
            await mediaSoupClient.produce(videoTrack, {type: 'screen'});
          }
          if (audioTrack) {
            console.log('🔊 创建屏幕音频生产者');
            await mediaSoupClient.produce(audioTrack, {type: 'screen-audio'});
          }

          // 设置屏幕共享为主视频
          console.log('📺 屏幕共享设为主视频');
          mainVideoStream.value = screenStream;

          // 如果有摄像头，设为辅助视频
          if (isCameraOn.value && cameraStream) {
            console.log('📹 摄像头设为辅助视频');
            secondaryVideoStream.value = cameraStream;
          } else {
            secondaryVideoStream.value = null;
          }

          isScreenSharing.value = true;

          // 确保视频流正确绑定到DOM
          await nextTick();
          bindVideoStreams();

          // 监听屏幕共享结束
          videoTrack.onended = () => {
            console.log('📺 屏幕共享被用户结束');
            toggleScreenShare();
          };
        }
      } catch (error) {
        console.error('屏幕共享操作失败:', error);
        alert('屏幕共享操作失败');
      }
    }

// 发送消息
    function sendMessage() {
      if (!newMessage.value.trim() || isSending.value) return;

      try {
        isSending.value = true;

        const messageData = {
          content: newMessage.value.trim(),
          timestamp: new Date().toISOString(),
          isCreator: isCreator.value
        };

        // 通过MediaSoupClient发送消息
        mediaSoupClient.sendMessage(messageData.content);

        // 清空输入框
        newMessage.value = '';

        console.log('消息发送成功:', messageData);
      } catch (error) {
        console.error('发送消息失败:', error);
        alert('发送消息失败: ' + error.message);
      } finally {
        isSending.value = false;
      }
    }

// 切换全体禁言
    function toggleMuteAll() {
      if (!isCreator.value) {
        console.log('⚠️ 非创建者无法切换全体禁言');
        return;
      }

      try {
        const newMuteState = !isMuteAll.value;
        mediaSoupClient.muteAll(newMuteState);
        isMuteAll.value = newMuteState;

        console.log(`${newMuteState ? '启用' : '取消'}全体禁言`);
      } catch (error) {
        console.error('切换禁言状态失败:', error);
        alert('切换禁言状态失败: ' + error.message);
      }
    }

// 切换画中画模式
    async function togglePictureInPicture() {
      if (!isPictureInPictureSupported.value || !mainVideoRef.value) {
        console.log('⚠️ 画中画不支持或无视频元素');
        return;
      }

      try {
        if (isPictureInPictureActive.value) {
          // 退出画中画
          await document.exitPictureInPicture();
          isPictureInPictureActive.value = false;
          console.log('✅ 退出画中画模式');
        } else {
          // 进入画中画
          await mainVideoRef.value.requestPictureInPicture();
          isPictureInPictureActive.value = true;
          console.log('✅ 进入画中画模式');
        }
      } catch (error) {
        console.error('画中画操作失败:', error);
        alert('画中画操作失败: ' + error.message);
      }
    }

// 离开会议
    async function leaveMeeting() {
      try {
        console.log('🚪 准备离开会议...');
        // 如果是创建者且正在录制，先停止录制
        if (isCreator.value ) {
          console.log('⏹️ 离开前停止录制...');
          try {
            await stopAutoRecording();
          } catch (error) {
            console.error('停止录制失败:', error);
          }
        }

        // 清理资源
        await cleanup();

        // 触发离开事件
        emit('leave');
        router.go(-1);

        console.log('✅ 已离开会议');
      } catch (error) {
        console.error('离开会议失败:', error);
        // 即使出错也要离开
        emit('leave');
      }
    }

// 格式化时间
    function formatTime(timestamp) {
      if (!timestamp) return '';

      const date = new Date(timestamp);
      const now = new Date();
      const diff = now - date;

      // 如果是今天，只显示时间
      if (diff < 24 * 60 * 60 * 1000) {
        return date.toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit'
        });
      } else {
        // 如果不是今天，显示日期和时间
        return date.toLocaleString('zh-CN', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    }

// 格式化录制时长
    function formatRecordingDuration(seconds) {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;

      if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      } else {
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
    }

// 清理资源
    async function cleanup() {
      console.log('🧹 开始清理资源...');

      try {
        // 清理摄像头监控
        if (cameraMonitorInterval) {
          clearInterval(cameraMonitorInterval);
          cameraMonitorInterval = null;
        }

        // 清理录制定时器
        stopRecordingTimer();

        // 清理所有音频元素
        const audioElements = document.querySelectorAll('audio[id^="audio-"]');
        audioElements.forEach(audioElement => {
          console.log('🗑️ 清理音频元素:', audioElement.id);
          audioElement.pause();
          audioElement.srcObject = null;
          audioElement.remove();
        });

        // 停止所有媒体流
        if (cameraStream) {
          cameraStream.getTracks().forEach(track => track.stop());
          cameraStream = null;
        }

        if (screenStream) {
          screenStream.getTracks().forEach(track => track.stop());
          screenStream = null;
        }

        // 关闭MediaSoup连接
        if (mediaSoupClient) {
          // 这里应该有MediaSoupClient的清理方法
          console.log('清理MediaSoup连接');
        }

        console.log('✅ 资源清理完成');
      } catch (error) {
        console.error('清理资源时发生错误:', error);
      }
    }

// 切换主辅视频
    function switchMainVideo() {
      if (!isCreator.value) {
        console.log('⚠️ 非创建者无法切换主辅视频');
        return;
      }

      // 只有当同时有摄像头和屏幕共享时才能切换
      if (!shouldShowSecondaryVideo.value) {
        console.log('⚠️ 只有同时存在摄像头和屏幕共享才能切换主辅视频');
        return;
      }

      console.log('=== 创建者切换主辅视频 ===');
      console.log('切换前 - 主视频:', mainVideoStream.value?.id);
      console.log('切换前 - 辅助视频:', secondaryVideoStream.value?.id);

      const temp = mainVideoStream.value;
      mainVideoStream.value = secondaryVideoStream.value;
      secondaryVideoStream.value = temp;

      console.log('切换后 - 主视频:', mainVideoStream.value?.id);
      console.log('切换后 - 辅助视频:', secondaryVideoStream.value?.id);

      // 通知服务器和其他用户进行同步切换
      if (mediaSoupClient) {
        mediaSoupClient.switchMainVideo({
          mainStreamId: mainVideoStream.value?.id,
          secondaryStreamId: secondaryVideoStream.value?.id
        });
        console.log('📤 已发送主辅视频切换通知到服务器');
      }
    }

// 主动发起 stopRecording（带会议id）到 extension
    function sendStopRecordingToExtension() {
      console.log('尝试发送停止录制到可用扩展');
      const meetingId = props.id;
      window.postMessage({
        type: 'FROM_PAGE',
        action: 'stopRecording',
        data: { meetingId },
        requestId: 'stop_' + Date.now()
      }, '*');
    }

// 自动开始扩展录制（仅创建者） - 修改为引导用户点击扩展图标
    async function startAutoRecording() {
      if (!isCreator.value) {
        console.log('⚠️ 非创建者无法开始录制');
        return;
      }

      if (isExtensionRecording.value) {
        console.log('⚠️ 录制已在进行中');
        return;
      }

      console.log('🔴 检查扩展状态并引导用户录制...');
      unifiedLogger.info('🔴 检查扩展状态并引导用户录制');

      try {
        // 检查扩展可用性
        const available = await updateExtensionStatus();
        if (!available) {
          console.warn('❌ 扩展不可用，无法开始录制');
          unifiedLogger.warn('❌ 扩展不可用，显示安装指导');
          showExtensionActivationDialog();
          return;
        }

        // 扩展可用，但不自动录制，而是引导用户点击扩展图标
        console.log('✅ 扩展可用，引导用户点击扩展图标启动录制');
        unifiedLogger.info('✅ 扩展可用，引导用户点击扩展图标启动录制');
        
        // 显示友好的引导对话框
        showExtensionActivationDialog();
        
        // 显示特定的引导消息
        setTimeout(() => {
          ElMessage({
            message: '🎬 扩展已就绪！请点击浏览器工具栏中的扩展图标开始录制',
            type: 'success',
            duration: 6000,
            showClose: true
          });
        }, 500);

      } catch (error) {
        console.error('❌ 检查扩展状态失败:', error);
        unifiedLogger.error('❌ 检查扩展状态失败', error);
        
        // 任何错误都引导用户手动启动
        showExtensionActivationDialog();
      }
    }

// 自动停止录制（仅创建者）
    async function stopAutoRecording() {
      if (!isCreator.value) {
        console.log('⚠️ 非创建者无法停止录制');
        return;
      }
      // if (!isExtensionRecording.value) {
      //   console.log('⚠️ 当前没有进行录制');
      //   return;
      // }
      console.log('⏹️ 准备自动停止录制...');
      try {
        sendStopRecordingToExtension();
        console.log('✅ stopRecording 消息已发送到 extension');
      } catch (error) {
        console.error('❌ 自动录制停止失败:', error);
      }
    }

// 手动切换录制状态
    async function toggleRecording() {
      if (!isCreator.value) {
        console.log('⚠️ 非创建者无法控制录制');
        return;
      }

      // 确保是通过真正的用户交互触发的（Chrome tabCapture要求）
      console.log('🎯 检查用户手势上下文...');
      
      try {
        if (isExtensionRecording.value) {
          await stopAutoRecording();
        } else {
          // 特别强调：确保这是用户主动点击的结果
          console.log('🔴 用户主动触发录制开始...');
          await startAutoRecording();
        }
      } catch (error) {
        console.error('录制状态切换失败:', error);

        // 检查是否是扩展未激活错误
        if (error instanceof Error && error.message === 'EXTENSION_NOT_ACTIVATED') {
          showExtensionActivationDialog();
        } else if (error instanceof Error && error.message.includes('user gesture')) {
          alert('录制需要用户交互才能启动。请直接点击录制按钮。');
        } else {
          alert('录制状态切换失败: ' + (error instanceof Error ? error.message : '未知错误'));
        }
      }
    }

// 异步检查扩展状态（带重试）
    async function updateExtensionStatus() {
      try {
        const available = await mediaSoupClient.checkExtensionAvailable();
        extensionAvailable.value = available;
        return available;
      } catch (error) {
        console.error('检查扩展状态失败:', error);
        extensionAvailable.value = false;
        return false;
      }
    }

// 录制计时器相关
    function startRecordingTimer() {
      if (recordingTimerInterval) {
        clearInterval(recordingTimerInterval);
      }

      recordingDuration.value = 0;
      recordingTimerInterval = setInterval(() => {
        recordingDuration.value++;
      }, 1000);
    }

    function stopRecordingTimer() {
      if (recordingTimerInterval) {
        clearInterval(recordingTimerInterval);
        recordingTimerInterval = null;
      }
      recordingDuration.value = 0;
    }

// 显示扩展激活对话框
    function showExtensionActivationDialog() {
      console.log('🔔 显示扩展激活提示对话框');
      showExtensionDialog.value = true;
    }

// 关闭扩展激活对话框
    function closeExtensionDialog() {
      showExtensionDialog.value = false;
      isRetryingRecording.value = false;
    }

// 重试录制 - 修改为引导用户点击扩展图标
    async function retryRecording() {
      if (isRetryingRecording.value) {
        console.log('⚠️ 正在重试录制中，请稍候');
        return;
      }

      console.log('🔄 引导用户通过扩展图标重试录制...');
      unifiedLogger.info('🔄 引导用户通过扩展图标重试录制');
      isRetryingRecording.value = true;

      try {
        // 检查扩展是否仍然可用
        const available = await updateExtensionStatus();
        if (!available) {
          throw new Error('扩展不可用，请检查扩展是否已安装并启用');
        }

        // 不再尝试自动录制，而是引导用户操作
        console.log('✅ 扩展可用，请用户点击扩展图标录制');
        unifiedLogger.info('✅ 扩展可用，引导用户点击扩展图标');
        
        // 显示明确的引导消息
        ElMessage({
          message: '🎬 请点击浏览器工具栏中的扩展图标 (MediaSoup Tab Recorder) 开始录制',
          type: 'info',
          duration: 8000,
          showClose: true
        });
        
        // 保持对话框开启，让用户知道下一步操作
        // 不关闭对话框，用户完成录制后扩展会自动更新状态

      } catch (error) {
        console.error('❌ 检查扩展状态失败:', error);
        unifiedLogger.error('❌ 检查扩展状态失败', error);

        if (error instanceof Error && 
            (error.message === 'EXTENSION_NOT_ACTIVATED' || 
             error.message.includes('runtime.getContexts') || 
             error.message.includes('contextTypes'))) {
          // 显示更友好的错误消息
          ElMessage.error({
            message: '请重启浏览器后再尝试使用扩展录制功能',
            duration: 5000
          });
        } else {
          ElMessage.error('检查扩展状态失败: ' + (error instanceof Error ? error.message : '未知错误'));
        }
      } finally {
        isRetryingRecording.value = false;
      }
    }

// 扩展重置功能
    async function resetExtension() {
      try {
        isResettingExtension.value = true;
        
        // 通过重置浏览器本地存储中的扩展相关数据来尝试重置
        localStorage.removeItem('mediasoup_recorder_extension_status');
        sessionStorage.removeItem('mediasoup_recorder_extension_status');
        
        // 重新加载页面以刷新所有扩展连接
        ElMessageBox.confirm(
          '重置扩展将会刷新页面，您确定要继续吗？',
          '重置扩展',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        ).then(() => {
          // 添加一个URL参数以标记页面重新加载来自扩展重置
          const url = new URL(window.location.href);
          url.searchParams.set('extension_reset', Date.now().toString());
          window.location.href = url.toString();
        }).catch(() => {
          isResettingExtension.value = false;
        });
      } catch (error) {
        console.error('重置扩展失败:', error);
        isResettingExtension.value = false;
        ElMessage.error('重置扩展失败');
      }
    }

    // 手动绑定视频流到DOM元素
    function bindVideoStreams() {
      console.log('🔗 手动绑定视频流到DOM元素');

      if (mainVideoRef.value && mainVideoStream.value) {
        console.log('🎬 绑定主视频流:', {
          streamId: mainVideoStream.value.id,
          active: mainVideoStream.value.active,
          tracks: mainVideoStream.value.getTracks().length,
          videoTracks: mainVideoStream.value.getVideoTracks().length,
          readyState: mainVideoRef.value.readyState
        });

        // 避免重复设置相同的srcObject
        if (mainVideoRef.value.srcObject !== mainVideoStream.value) {
          mainVideoRef.value.srcObject = mainVideoStream.value;

          // 添加视频加载事件监听器
          const handleLoadedMetadata = () => {
            console.log('📺 主视频元数据已加载');
            mainVideoRef.value?.play().then(() => {
              console.log('✅ 主视频播放成功');
            }).catch(error => {
              console.warn('⚠️ 主视频播放失败:', error.message);
            });
          };

          const handleLoadedData = () => {
            console.log('📺 主视频数据已加载');
          };

          const handleCanPlay = () => {
            console.log('📺 主视频可以播放');
            if (mainVideoRef.value?.paused) {
              mainVideoRef.value.play().catch(error => {
                console.warn('⚠️ 主视频自动播放失败:', error.message);
              });
            }
          };

          // 移除旧的事件监听器
          mainVideoRef.value.removeEventListener('loadedmetadata', handleLoadedMetadata);
          mainVideoRef.value.removeEventListener('loadeddata', handleLoadedData);
          mainVideoRef.value.removeEventListener('canplay', handleCanPlay);

          // 添加新的事件监听器
          mainVideoRef.value.addEventListener('loadedmetadata', handleLoadedMetadata);
          mainVideoRef.value.addEventListener('loadeddata', handleLoadedData);
          mainVideoRef.value.addEventListener('canplay', handleCanPlay);

          // 兜底的播放尝试
          setTimeout(async () => {
            try {
              if (mainVideoRef.value && mainVideoRef.value.paused) {
                await mainVideoRef.value.play();
                console.log('✅ 主视频延迟播放成功');
              }
            } catch (error) {
              console.warn('⚠️ 主视频延迟播放失败:', error.message);
              // 再次尝试播放
              setTimeout(() => {
                if (mainVideoRef.value && mainVideoRef.value.paused) {
                  mainVideoRef.value.play().catch(e => {
                    console.warn('⚠️ 主视频最终重试播放失败:', e.message);
                  });
                }
              }, 1000);
            }
          }, 500);
        } else {
          console.log('📺 主视频流未改变，跳过重新绑定');
        }

        // 设置画中画监听器
        setupPictureInPictureListeners();
      } else {
        console.log('⚠️ 主视频ref或stream不存在:', {
          hasRef: !!mainVideoRef.value,
          hasStream: !!mainVideoStream.value
        });
      }

      if (secondaryVideoRef.value && secondaryVideoStream.value) {
        console.log('🎬 绑定辅助视频流:', {
          streamId: secondaryVideoStream.value.id,
          active: secondaryVideoStream.value.active,
          tracks: secondaryVideoStream.value.getTracks().length
        });

        if (secondaryVideoRef.value.srcObject !== secondaryVideoStream.value) {
          secondaryVideoRef.value.srcObject = secondaryVideoStream.value;

          setTimeout(async () => {
            try {
              if (secondaryVideoRef.value && secondaryVideoRef.value.paused) {
                await secondaryVideoRef.value.play();
                console.log('✅ 辅助视频播放成功');
              }
            } catch (error) {
              console.warn('⚠️ 辅助视频播放失败:', error.message);
            }
          }, 100);
        }
      }
    }

// 监听视频流变化，确保正确绑定到video元素
    watch(mainVideoStream, async (newStream, oldStream) => {
      console.log('📺 主视频流变化:', {
        newStreamId: newStream?.id,
        oldStreamId: oldStream?.id,
        newStreamActive: newStream?.active,
        tracks: newStream?.getTracks().length || 0
      });

      await nextTick(); // 确保DOM更新完成

      if (mainVideoRef.value && newStream) {
        console.log('🔄 更新主视频元素的srcObject');

        // 避免重复设置相同的流
        if (mainVideoRef.value.srcObject !== newStream) {
          // 先暂停当前视频
          if (!mainVideoRef.value.paused) {
            mainVideoRef.value.pause();
          }

          mainVideoRef.value.srcObject = newStream;

          // 延迟播放新流
          setTimeout(async () => {
            try {
              if (mainVideoRef.value && newStream.active) {
                await mainVideoRef.value.play();
                console.log('✅ 主视频流切换播放成功');
              }
            } catch (error) {
              console.warn('⚠️ 主视频流切换播放失败:', error.message);
            }
          }, 200);
        }
      }
    });

    watch(secondaryVideoStream, async (newStream, oldStream) => {
      console.log('📺 辅助视频流变化:', {
        newStreamId: newStream?.id,
        oldStreamId: oldStream?.id,
        newStreamActive: newStream?.active
      });

      await nextTick(); // 确保DOM更新完成

      if (secondaryVideoRef.value && newStream) {
        console.log('🔄 更新辅助视频元素的srcObject');

        if (secondaryVideoRef.value.srcObject !== newStream) {
          if (!secondaryVideoRef.value.paused) {
            secondaryVideoRef.value.pause();
          }

          secondaryVideoRef.value.srcObject = newStream;

          setTimeout(async () => {
            try {
              if (secondaryVideoRef.value && newStream.active) {
                await secondaryVideoRef.value.play();
                console.log('✅ 辅助视频流切换播放成功');
              }
            } catch (error) {
              console.warn('⚠️ 辅助视频流切换播放失败:', error.message);
            }
          }, 200);
        }
      }
    });

// 设置画中画监听器
    function setupPictureInPictureListeners() {
      if (!mainVideoRef.value) return;

      mainVideoRef.value.addEventListener('enterpictureinpicture', () => {
        isPictureInPictureActive.value = true;
        console.log('进入画中画模式');
      });

      mainVideoRef.value.addEventListener('leavepictureinpicture', () => {
        isPictureInPictureActive.value = false;
        console.log('退出画中画模式');
      });
    }

    // 初始化音频上下文
    const audioContext = ref(null);
    const audioContextInitialized = ref(false);

    const initAudioContext = async () => {
      if (!audioContextInitialized.value) {
        try {
          audioContext.value = new (window.AudioContext || window.webkitAudioContext)();
          await audioContext.value.resume();
          audioContextInitialized.value = true;
          console.log('🎵 音频上下文初始化成功');
        } catch (error) {
          console.error('❌ 音频上下文初始化失败:', error);
        }
      }
    };

    // 监听来自content script的录制状态消息
    function handleExtensionRecordingStatus(event) {
      if (!event.data || event.data.type !== 'FROM_BACKGROUND') return;
      if (event.data.action === 'recordingStarted') {
        isExtensionRecording.value = true;
        startRecordingTimer();
      } else if (event.data.action === 'recordingStopped') {
        isExtensionRecording.value = false;
        stopRecordingTimer();
      }
    }

    onMounted(() => {
      window.addEventListener('message', handleExtensionRecordingStatus);
    });
    onUnmounted(() => {
      window.removeEventListener('message', handleExtensionRecordingStatus);
    });

    return {
      mainVideoRef,
      secondaryVideoRef,
      chatMessagesRef,
      mainVideoStream,
      secondaryVideoStream,
      shouldShowSecondaryVideo,
      isCameraOn,
      isScreenSharing,
      isExtensionRecording,
      recordingDuration,
      extensionAvailable,
      showExtensionDialog,
      isRetryingRecording,
      isMuteAll,
      isSending,
      isPictureInPictureSupported,
      isPictureInPictureActive,
      messages,
      newMessage,
      meetingTitle,
      toggleCamera,
      toggleScreenShare,
      togglePictureInPicture,
      switchMainVideo,
      sendMessage,
      toggleMuteAll,
      leaveMeeting,
      formatTime,
      isCreator,
      startAutoRecording,
      stopAutoRecording,
      toggleRecording,
      updateExtensionStatus,
      formatRecordingDuration,
      showExtensionActivationDialog,
      closeExtensionDialog,
      retryRecording,
      resetExtension,
      initAudioContext // 暴露音频上下文初始化函数
    };
  }
}

</script>

<style scoped>
.meeting-container {
  display: flex;
  height: 100vh;
  background: #1a1a1a;
  color: white;
}

.video-area {
  flex: 1;
  position: relative;
  background: #000;
}

.main-video {
  width: 100%;
  height: 100%;
  position: relative;
}

.main-video-element {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 新增：主视频内部右上角的辅视频 */
.secondary-video-inside {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 300px;
  height: 200px;
  border: 2px solid #333;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s;
  z-index: 2;
  background: #111;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

.secondary-video-inside:hover {
  transform: scale(1.05);
}

.secondary-video-element {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.switch-button {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
}

.switch-button:hover {
  background: rgba(0, 0, 0, 0.9);
}

.viewer-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

/* 移除原有.secondary-video样式，避免外部定位 */
.secondary-video{
  border-left: 1px solid #444;
}

.chat-header {
  padding: 20px;
  border-bottom: 1px solid #444;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-header h3 {
  margin: 0;
  font-size: 18px;
}

.mute-button {
  background: #666;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s;
}

.mute-button:hover {
  background: #777;
}

.mute-button.active {
  background: #ff4444;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.message {
  margin-bottom: 16px;
  padding: 12px;
  background: #333;
  border-radius: 8px;
}

.message.creator {
  background: #4a4a4a;
  border-left: 4px solid #007bff;
}

.message-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 12px;
  color: #ccc;
}

.message-author {
  font-weight: bold;
}

.message-content {
  font-size: 14px;
  line-height: 1.4;
}

.chat-input {
  padding: 20px;
  border-top: 1px solid #444;
  display: flex;
  gap: 10px;
}

.chat-input input {
  flex: 1;
  background: #333;
  border: 1px solid #555;
  color: white;
  padding: 10px;
  border-radius: 4px;
  font-size: 14px;
}

.chat-input input:focus {
  outline: none;
  border-color: #007bff;
}

.chat-input button {
  background: #007bff;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.chat-input button:hover:not(:disabled) {
  background: #0056b3;
}

.chat-input button:disabled {
  background: #666;
  cursor: not-allowed;
}

.mute-notice {
  padding: 20px;
  text-align: center;
  color: #999;
  border-top: 1px solid #444;
}

.control-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 350px;
  background: rgba(0, 0, 0, 0.8);
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.control-group {
  display: flex;
  gap: 12px;
}

.control-button {
  background: #333;
  color: white;
  border: none;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  transition: all 0.2s;
}

.control-button:hover {
  background: #444;
}

.control-button.active {
  background: #007bff;
}

.control-button.recording {
  background: #dc3545;
  animation: recording-pulse 2s infinite;
}

.control-button.recording-status {
  background: #dc3545;
  animation: recording-pulse 2s infinite;
  cursor: default;
  pointer-events: none;
}

.control-button.recording-status:hover {
  background: #dc3545;
}

@keyframes recording-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.control-button.leave {
  background: #dc3545;
}

.control-button.leave:hover {
  background: #c82333;
}

.meeting-info {
  padding: 20px;
  background: #2a2a2a;
  color: white;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  border-bottom: 1px solid #444;
}

.meeting-details {
  text-align: right;
}

.meeting-title {
  margin: 0;
  font-size: 24px;
}

.meeting-times span {
  display: block;
  font-size: 16px;
  margin-top: 5px;
}

/* 录制状态样式 */
.recording-status {
  color: #ff4444;
  border: 1px solid #ff4444;
  animation: pulse 2s infinite;
}

/* 扩展警告样式 */
.extension-warning {
  background: rgba(255, 165, 0, 0.1);
  color: #ff8800;
  border: 1px solid #ff8800;
  cursor: help;
}

.extension-warning:hover {
  background: rgba(255, 165, 0, 0.2);
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
  100% {
    opacity: 1;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .meeting-container {
    flex-direction: column;
  }

  .chat-area {
    width: 100%;
    height: 300px;
  }

  .control-bar {
    right: 0;
  }

  .secondary-video-inside {
    width: 150px;
    height: 100px;
    top: 10px;
    right: 10px;
  }
}

.main-video-element {
  width: 100%;
  height: 100%;
  object-fit: contain; /* 根据屏幕比例缩放视频 */
}

/* 扩展激活对话框样式 */
.extension-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.extension-dialog {
  background: #2a2a2a;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 16px;
  border-bottom: 1px solid #444;
}

.dialog-header h3 {
  margin: 0;
  color: #ff8800;
  font-size: 20px;
}

.close-button {
  background: none;
  border: none;
  color: #999;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-button:hover {
  background: #444;
  color: white;
}

.dialog-content {
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.dialog-icon {
  margin-bottom: 16px;
}

.dialog-text {
  color: #e0e0e0;
  line-height: 1.6;
}

.dialog-text strong {
  color: white;
  font-size: 18px;
}

.dialog-text p {
  margin: 12px 0;
}

.dialog-text ol {
  text-align: left;
  margin: 16px 0;
  padding-left: 20px;
}

.dialog-text li {
  margin-bottom: 8px;
  color: #c0c0c0;
}

.dialog-actions {
  padding: 16px 24px 24px;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.retry-button {
  background: #ff8800;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.retry-button:hover:not(:disabled) {
  background: #e67a00;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.retry-button:disabled {
  background: #666;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.retry-button:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.reset-button {
  background: #3498db;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.reset-button:hover:not(:disabled) {
  background: #2980b9;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.reset-button:disabled {
  background: #666;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.reset-button:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.cancel-button {
  background: #444;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
}

.cancel-button:hover {
  background: #555;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .extension-dialog {
    margin: 20px;
    width: calc(100% - 40px);
  }

  .dialog-actions {
    flex-direction: column;
  }

  .retry-button,
  .cancel-button {
    width: 100%;
  }
}
</style>

