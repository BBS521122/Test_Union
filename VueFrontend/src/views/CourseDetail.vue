<template>
  <div class="course-detail">
    <!-- 顶部导航 -->
    <div class="header-nav">
      <a href="#" class="active">课程详情</a>
    </div>

    <!-- 操作按钮栏 -->
    <div class="action-bar">
      <button class="action-btn back-btn" @click="goBack">
        <i class="fas fa-arrow-left"></i> 返回主界面
      </button>
      <button class="action-btn chapter-btn" @click="goToChapterDetail">
        <i class="fas fa-list"></i> 章节管理
      </button>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>正在加载课程详情...</p>
    </div>

    <div v-else-if="error" class="error-message">
      <i class="fas fa-exclamation-triangle"></i>
      <p>{{ error }}</p>
      <button @click="fetchCourse" class="retry-button">重试</button>
    </div>

    <div v-else class="detail-container">
      <!-- 课程基本信息 -->
      <div class="detail-header">
        <h1>{{ course.courseName }}</h1>
        <div class="meta-info">
          <div class="meta-item">
            <i class="fas fa-user"></i>
            <span>作者: {{ course.courseAuthor || '未知' }}</span>
          </div>
          <div class="meta-item">
            <i class="fas fa-sort-numeric-up"></i>
            <span>排序: {{ course.courseSort }}</span>
          </div>
          <div class="meta-item">
            <i class="fas fa-check-circle"></i>
            <span :class="'audit-status-' + (course.state || 0)">
              状态: {{ getAuditStatusText(course.state) }}
            </span>
          </div>
          <div class="meta-item">
            <i class="fas fa-calendar-alt"></i>
            <span>创建时间: {{ formatDate(course.courseCreateTime) }}</span>
          </div>
        </div>
      </div>

      <div class="detail-content">
        <!-- 封面展示 -->
        <div class="cover-section">
          <h3><i class="fas fa-image"></i> 课程封面</h3>
          <div class="cover-image-container">
            <img
                :src="course.coverUrl || placeholderImage"
                @error="handleImageError"
                alt="课程封面"
                class="cover-image"
            >
          </div>
        </div>

        <!-- 课程描述 -->
        <div class="description-section">
          <h3><i class="fas fa-align-left"></i> 课程描述</h3>
          <div class="description-content">
            <p>{{ course.courseDescription || '暂无详细描述' }}</p>
          </div>
        </div>

        <!-- 课程统计信息 -->
        <div class="stats-section">
          <h3><i class="fas fa-chart-bar"></i> 课程统计</h3>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-number">{{ course.id }}</div>
              <div class="stat-label">课程ID</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">{{ chapterCount }}</div>
              <div class="stat-label">章节数量</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">{{ course.courseSort }}</div>
              <div class="stat-label">排序权重</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">{{ formatDate(course.courseUpdateTime) }}</div>
              <div class="stat-label">最后更新</div>
            </div>
          </div>
        </div>

        <!-- 课程章节列表 -->
        <div class="chapters-section">
          <h3><i class="fas fa-list-alt"></i> 课程章节</h3>
          <div v-if="chapters.length > 0" class="chapter-list">
            <div v-for="(chapter, index) in chapters" :key="chapter.id || index" class="chapter-item">
              <div class="chapter-info">
                <span class="chapter-order">{{ chapter.order }}.</span>
                <span class="chapter-name">{{ chapter.name }}</span>
              </div>
              <button v-if="chapter.videoUrl" class="play-chapter-btn" @click="playChapterVideo(chapter.videoUrl)">
                <i class="fas fa-play-circle"></i> 播放视频
              </button>
              <span v-else class="no-video-text"><i class="fas fa-times-circle"></i> 无视频</span>
            </div>
          </div>
          <div v-else class="no-chapters-info">
            <i class="fas fa-exclamation-circle"></i>
            <p>该课程暂无章节内容。</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 视频播放模态框 -->
    <div v-if="showVideoModal" class="video-modal" @click.self="closeVideoModal">
      <div class="video-modal-content">
        <button class="close-button" @click="closeVideoModal">
          <i class="fas fa-times"></i>
        </button>
        <video
            :src="currentVideoUrl"
            controls
            class="video-player"
            autoplay
        ></video>
      </div>
    </div>

    <!-- 删除确认模态框 -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
      <div class="delete-modal">
        <div class="warning-icon">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <h3>确认删除</h3>
        <p>确定要删除课程 <span class="course-highlight">{{ course.courseName }}</span> 吗？</p>
        <p class="warning-text">此操作将同时删除该课程的所有章节，且无法恢复！</p>
        <div class="modal-actions">
          <button @click="showDeleteConfirm = false" class="cancel-button">取消</button>
          <button @click="confirmDelete" class="delete-button">确认删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import dayjs from 'dayjs';

export default {
  setup() {
    const route = useRoute();
    const router = useRouter();
    const courseId = ref(route.params.id);
    const course = ref({});
    const chapters = ref([]); // 新增：用于存储章节列表
    const loading = ref(true);
    const error = ref(null);
    const showVideoModal = ref(false);
    const currentVideoUrl = ref(''); // 新增：用于存储当前播放的视频URL
    const showDeleteConfirm = ref(false);
    const chapterCount = ref(0);
    const placeholderImage = "/images/default-cover.jpeg";

    // 审核状态文本映射
    const getAuditStatusText = (state) => {
      return {
        0: '未审核',
        1: '已通过',
        2: '已拒绝'
      }[state] || '未知状态';
    };

    // 获取课程详情和章节列表
    const fetchCourse = async () => {
      try {
        loading.value = true;
        error.value = null;

        // 获取课程基本信息
        const courseResponse = await axios.get(
            `/course/get-course-info?courseId=${courseId.value}`
        );

        if (courseResponse.data && courseResponse.data.code === 200) {
          course.value = courseResponse.data.data;
          console.log(course.value)
        } else {
          throw new Error(courseResponse.data?.message || '未找到课程信息');
        }

        // 获取章节列表
        const chapterResponse = await axios.get(
            `/course/get-chapter?courseId=${courseId.value}`
        );

        if (chapterResponse.data && chapterResponse.data.code === 200) {
          chapters.value = chapterResponse.data.data || [];
          chapterCount.value = chapters.value.length; // 更新章节数量
        } else {
          console.warn('获取章节失败或无章节数据:', chapterResponse.data?.message);
          chapters.value = [];
          chapterCount.value = 0;
        }

      } catch (err) {
        console.error('获取课程详情失败:', err);
        error.value = '无法加载课程详情，请检查网络连接';
      } finally {
        loading.value = false;
      }
    };

    // 日期格式化
    const formatDate = (dateInput) => {
      if (!dateInput) return '未知时间';
      const date = dayjs(dateInput);
      return date.isValid() ? date.format('YYYY-MM-DD HH:mm') : '无效日期';
    };



    // 图片加载错误处理
    const handleImageError = (event) => {
      if (event.target.src !== placeholderImage) {
        event.target.src = placeholderImage;
      }
    };

    // 播放章节视频
    const playChapterVideo = (url) => {
      if (url) {
        currentVideoUrl.value = url;
        showVideoModal.value = true;
      } else {
        alert('该章节没有视频资源');
      }
    };

    // 关闭视频模态框
    const closeVideoModal = () => {
      showVideoModal.value = false;
      currentVideoUrl.value = ''; // 清空当前播放的视频URL
    };

    // 导航方法
    const goBack = () => {
      if(localStorage.getItem("role")==="ADMIN"){
        router.push({ name: 'admin' });
      }
      else{
        router.push({ name: 'user' });
      }
    };

    const goToChapterDetail = () => {
      router.push({
        name: 'ChapterDetail',
        params: { courseId: courseId.value }
      });
    };

    // 快速操作方法
    const editCourse = () => {
      // 跳转到编辑页面或打开编辑模态框
      router.push({
        name: 'admin',
        query: { edit: courseId.value }
      });
    };

    const previewCourse = () => {
      // 预览课程功能：播放第一个章节的视频
      if (chapters.value.length > 0 && chapters.value[0].videoUrl) {
        playChapterVideo(chapters.value[0].videoUrl);
      } else {
        alert('该课程暂无视频内容或第一个章节没有视频');
      }
    };

    const deleteCourse = () => {
      showDeleteConfirm.value = true;
    };

    const confirmDelete = async () => {
      try {
        const response = await axios.get(
            `/course/delete-course?courseId=${courseId.value}`
        );

        if (response.data && response.data.code === 200) {
          alert('课程删除成功！');
          router.push({ name: 'admin' });
        } else {
          throw new Error(response.data?.message || '删除失败');
        }
      } catch (err) {
        console.error('删除课程失败:', err);
        alert('删除课程失败: ' + err.message);
      } finally {
        showDeleteConfirm.value = false;
      }
    };

    onMounted(() => {
      fetchCourse();
    });

    return {
      course,
      chapters, // 暴露 chapters 状态
      loading,
      error,
      showVideoModal,
      currentVideoUrl, // 暴露 currentVideoUrl 状态
      showDeleteConfirm,
      chapterCount,
      placeholderImage,
      getAuditStatusText,
      fetchCourse,
      formatDate,
      handleImageError,
      playChapterVideo, // 暴露 playChapterVideo 方法
      closeVideoModal,
      goBack,
      goToChapterDetail,
      editCourse,
      previewCourse,
      deleteCourse,
      confirmDelete
    };
  }
}
</script>

<style scoped>
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: 'Microsoft YaHei', sans-serif;
  transition: all 0.2s ease;
}

.course-detail {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

/* 顶部导航栏 */
.header-nav {
  border-bottom: 1px solid #e5e5e5;
  padding: 12px 16px;
  background: #f8f9fa;
  font-size: 16px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}

.header-nav a {
  margin-right: 20px;
  text-decoration: none;
  color: #495057;
  font-size: 16px;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 4px;
}

.header-nav a:hover {
  color: #007bff;
  background: rgba(0,123,255,0.1);
}

.header-nav a.active {
  color: #007bff;
  font-weight: 600;
  background: rgba(0,123,255,0.15);
}

/* 操作按钮区 */
.action-bar {
  padding: 16px;
  border-bottom: 1px solid #e5e5e5;
  display: flex;
  gap: 12px;
  background: #f8fafc;
  border-radius: 10px;
  margin: 15px 0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.action-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: #fff;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

.back-btn {
  background: linear-gradient(to bottom, #6c757d, #5a6268);
}

.back-btn:hover {
  background: linear-gradient(to bottom, #5a6268, #495057);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(108,117,125,0.3);
}

.chapter-btn {
  background: linear-gradient(to bottom, #17a2b8, #138496);
}

.chapter-btn:hover {
  background: linear-gradient(to bottom, #138496, #117a8b);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(23,162,184,0.3);
}

/* 详情容器 */
.detail-container {
  padding: 24px 0;
}

.detail-header {
  padding: 20px 0;
  border-bottom: 2px solid #e5e5e5;
  margin-bottom: 30px;
}

.detail-header h1 {
  font-size: 28px;
  color: #2c3e50;
  margin-bottom: 16px;
  font-weight: 700;
}

.meta-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 12px;
  color: #6c757d;
  font-size: 14px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #007bff;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}

.meta-item i {
  color: #007bff;
  width: 16px;
  text-align: center;
}

/* 审核状态样式 */
.audit-status-0 {
  color: #e6a23c !important;
  font-weight: bold;
}

.audit-status-1 {
  color: #67c23a !important;
  font-weight: bold;
}

.audit-status-2 {
  color: #f56c6c !important;
  font-weight: bold;
}

/* 内容区域 */
.detail-content {
  display: grid;
  gap: 30px;
}

/* 封面区域 */
.cover-section {
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.cover-section h3 {
  font-size: 18px;
  color: #2c3e50;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #dee2e6;
  display: flex;
  align-items: center;
  gap: 8px;
}

.cover-image-container {
  position: relative;
  text-align: center;
}

.cover-image {
  max-width: 100%;
  max-height: 400px;
  border-radius: 8px;
  box-shadow: 0 6px 15px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s;
}

.cover-image:hover {
  transform: scale(1.02);
}

.play-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 70px;
  height: 70px;
  background: rgba(0, 123, 255, 0.8);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  box-shadow: 0 6px 12px rgba(0, 123, 255, 0.4);
}

.play-icon:hover {
  background: rgba(0, 123, 255, 1);
  transform: translate(-50%, -50%) scale(1.1);
  box-shadow: 0 8px 16px rgba(0, 123, 255, 0.5);
}

/* 描述区域 */
.description-section {
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.description-section h3 {
  font-size: 18px;
  color: #2c3e50;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #dee2e6;
  display: flex;
  align-items: center;
  gap: 8px;
}

.description-content {
  line-height: 1.8;
  color: #495057;
  font-size: 15px;
}

.description-content p {
  margin-bottom: 12px;
}

/* 统计信息区域 */
.stats-section {
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.stats-section h3 {
  font-size: 18px;
  color: #2c3e50;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #dee2e6;
  display: flex;
  align-items: center;
  gap: 8px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.stat-item {
  text-align: center;
  padding: 20px;
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  border-radius: 8px;
  border: 1px solid #dee2e6;
  transition: all 0.3s;
  box-shadow: 0 3px 6px rgba(0,0,0,0.05);
}

.stat-item:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 12px rgba(0,0,0,0.1);
}

.stat-number {
  font-size: 24px;
  font-weight: 700;
  color: #007bff;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #6c757d;
  font-weight: 500;
}

/* 快速操作区域 */

.quick-actions h3 {
  font-size: 18px;
  color: #2c3e50;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #dee2e6;
  display: flex;
  align-items: center;
  gap: 8px;
}



.quick-btn i {
  font-size: 24px;
}

/* 视频模态框 */
.video-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.video-modal-content {
  position: relative;
  width: 90%;
  max-width: 900px;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0,0,0,0.5);
}

.close-button {
  position: absolute;
  top: 15px;
  right: 15px;
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  font-size: 18px;
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.4);
  transform: scale(1.1);
}

.video-player {
  width: 100%;
  height: auto;
  max-height: 70vh;
  display: block;
}

/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  backdrop-filter: blur(5px);
}

.delete-modal {
  background: #fff;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  padding: 30px 35px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
  position: relative;
  animation: modalAppear 0.4s ease-out;
  border: 1px solid rgba(255,255,255,0.2);
}

@keyframes modalAppear {
  0% {
    transform: translateY(20px);
    opacity: 0;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}

.warning-icon {
  text-align: center;
  margin-bottom: 20px;
}

.warning-icon i {
  font-size: 48px;
  color: #e74c3c;
  background: rgba(231, 76, 60, 0.1);
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 8px rgba(231,76,60,0.2);
}

.delete-modal h3 {
  font-size: 22px;
  color: #2c3e50;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
}

.delete-modal p {
  color: #7f8c8d;
  margin-bottom: 15px;
  font-size: 16px;
  line-height: 1.6;
}

.warning-text {
  color: #e74c3c !important;
  font-weight: 600;
  margin-bottom: 30px !important;
}

.course-highlight {
  color: #007bff;
  font-weight: 600;
}

.modal-actions {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 20px;
}

.cancel-button, .delete-button {
  padding: 10px 25px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
  transition: all 0.3s;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

.cancel-button {
  background: #f5f7fa;
  color: #606266;
  border: 1px solid #dcdfe6;
}

.cancel-button:hover {
  background: #e6e9ed;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.delete-button {
  background: linear-gradient(135deg, #e74c3c, #c0392b);
  color: white;
  border: none;
}

.delete-button:hover {
  background: linear-gradient(135deg, #c0392b, #a53124);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(231,76,60,0.3);
}

/* 加载和错误状态 */
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 40px;
  background: #f8f9fa;
  border-radius: 8px;
  margin: 30px 0;
  box-shadow: 0 4px 8px rgba(0,0,0,0.05);
}

.spinner {
  width: 50px;
  height: 50px;
  border: 5px solid rgba(52, 152, 219, 0.2);
  border-top: 5px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 40px;
  text-align: center;
  background: #f8f9fa;
  border-radius: 8px;
  margin: 30px 0;
  font-size: 16px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.05);
}

.error-message i {
  font-size: 48px;
  color: #e74c3c;
  margin-bottom: 20px;
}

.retry-button {
  background: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  margin-top: 20px;
  font-size: 15px;
  transition: all 0.3s;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

.retry-button:hover {
  background: #0069d9;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

/* 章节列表样式 */
.chapters-section {
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.chapters-section h3 {
  font-size: 18px;
  color: #2c3e50;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #dee2e6;
  display: flex;
  align-items: center;
  gap: 8px;
}

.chapter-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.chapter-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 15px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.chapter-item:hover {
  background: #e2e6ea;
  transform: translateY(-2px);
  box-shadow: 0 6px 10px rgba(0, 0, 0, 0.08);
}

.chapter-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-grow: 1;
}

.chapter-order {
  font-weight: 700;
  color: #007bff;
  font-size: 16px;
}

.chapter-name {
  font-size: 15px;
  color: #34495e;
}

.play-chapter-btn {
  background: #28a745;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s;
  box-shadow: 0 2px 4px rgba(40,167,69,0.2);
}

.play-chapter-btn:hover {
  background: #218838;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(40,167,69,0.3);
}

.no-video-text {
  color: #dc3545;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.no-chapters-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 150px;
  padding: 20px;
  background: #f0f2f5;
  border-radius: 8px;
  text-align: center;
  color: #6c757d;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
}

.no-chapters-info i {
  font-size: 36px;
  margin-bottom: 15px;
}

.no-chapters-info p {
  font-size: 16px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .action-bar {
    flex-direction: column;
    gap: 8px;
  }

  .action-btn {
    justify-content: center;
  }

  .detail-header h1 {
    font-size: 24px;
  }

  .meta-info {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }


  .cover-image {
    max-height: 300px;
  }


  .chapter-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  .play-chapter-btn, .no-video-text {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .course-detail {
    padding: 0 10px;
  }

  .detail-header h1 {
    font-size: 20px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }


  .cover-section,
  .description-section,
  .stats-section,
  .quick-actions {
    padding: 16px;
  }

}
</style>

