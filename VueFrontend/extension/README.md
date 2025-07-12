# MediaSoup Tab Recorder Extension

这是一个修复后的Chrome扩展，用于录制标签页的音视频内容。该扩展完全兼容前端代码中的`MediaSoupTabRecorder` API接口。

## 主要功能

- 录制当前标签页的音频和视频
- 支持popup按钮控制录制开始/停止
- 提供完整的JavaScript API供前端调用
- 支持文件上传到后端服务器
- 错误处理和状态管理

## 文件结构

```
fixed_extension/
├── manifest.json          # 扩展配置文件
├── background.js          # 后台服务工作者
├── offscreen.html         # 离屏文档HTML
├── offscreen.js           # 离屏文档脚本，处理录制逻辑
├── content.js             # 内容脚本，桥接页面和扩展
├── injected_script.js     # 注入脚本，提供API接口
├── popup.html             # 弹窗界面
├── popup.js               # 弹窗控制脚本
├── icons/                 # 扩展图标
└── README.md              # 说明文档
```

## API接口

### 全局对象
```javascript
window.MediaSoupTabRecorder = {
    isAvailable: boolean,
    isRecording: boolean,
    
    // 事件回调
    onRecordingStarted?: (data: any) => void,
    onRecordingStopped?: (data: any) => void,
    onUploadSuccess?: (data: any) => void,
    onUploadFailed?: (data: any) => void,
    onError?: (error: any) => void,
    
    // 核心方法
    startRecording(config?: any): Promise<any>,
    stopRecording(): Promise<any>,
    getRecordingStatus(): Promise<{ isRecording: boolean; duration: number }>,
    waitForReady?(timeout?: number): Promise<boolean>
}
```

### 使用示例

#### 开始录制
```javascript
const result = await window.MediaSoupTabRecorder.startRecording({
    roomId: 'room123',
    peerId: 'peer456',
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
});
```

#### 停止录制
```javascript
const result = await window.MediaSoupTabRecorder.stopRecording();
```

#### 获取录制状态
```javascript
const status = await window.MediaSoupTabRecorder.getRecordingStatus();
console.log('Is recording:', status.isRecording);
console.log('Duration:', status.duration);
```

#### 设置事件回调
```javascript
window.MediaSoupTabRecorder.onRecordingStarted = (data) => {
    console.log('Recording started:', data);
};

window.MediaSoupTabRecorder.onRecordingStopped = (data) => {
    console.log('Recording stopped:', data);
};

window.MediaSoupTabRecorder.onError = (error) => {
    console.error('Recording error:', error);
};
```

## 安装方法

1. 打开Chrome浏览器
2. 进入扩展管理页面 (chrome://extensions/)
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择`fixed_extension`文件夹

## 使用方法

### 方法1：通过Popup界面
1. 点击扩展图标打开popup
2. 点击"Start Recording"开始录制
3. 点击"Stop Recording"停止录制

### 方法2：通过JavaScript API
1. 在网页中调用`window.MediaSoupTabRecorder.startRecording()`
2. 调用`window.MediaSoupTabRecorder.stopRecording()`停止录制

## 主要修复内容

1. **修复了offscreen.js中的重复代码问题**
   - 移除了重复的消息监听器
   - 统一了录制逻辑

2. **改进了消息传递机制**
   - 修复了background和offscreen之间的通信
   - 添加了超时处理和错误处理

3. **完善了API兼容性**
   - 确保返回值格式与前端期望一致
   - 添加了所有必需的错误类型

4. **增强了状态管理**
   - 正确维护录制状态
   - 添加了时长计算

5. **添加了popup界面**
   - 提供可视化的录制控制
   - 实时显示录制状态和时长

## 权限说明

- `activeTab`: 访问当前活动标签页
- `tabCapture`: 录制标签页音视频
- `scripting`: 注入内容脚本
- `storage`: 存储扩展数据
- `offscreen`: 创建离屏文档

## 技术实现

1. **录制流程**:
   - background.js获取当前标签页ID
   - 使用chrome.tabCapture.getMediaStreamId获取流ID
   - 将流ID传递给offscreen.js
   - offscreen.js使用MediaRecorder API进行录制

2. **数据传递**:
   - 录制完成后将Blob转换为ArrayBuffer
   - 通过消息传递发送到background.js
   - background.js重新构建Blob用于上传

3. **API注入**:
   - content.js注入injected_script.js到页面
   - injected_script.js创建MediaSoupTabRecorder全局对象
   - 通过postMessage与content.js通信

## 错误处理

扩展会抛出以下特定错误：
- `'NEED_USER_GESTURE'` - 需要用户手势
- `'ABORT_ERROR'` - 录制被中止
- `'activeTab permission required'` - 权限不足
- `'Extension not available'` - 扩展不可用

## 注意事项

1. 录制需要用户手势触发（点击等）
2. 确保浏览器版本支持chrome.tabCapture API
3. 录制的视频格式为WebM
4. 大文件录制可能需要较长时间处理

