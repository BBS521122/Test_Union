<template>
  <div class="chapter-detail">
    <!-- 顶部导航 -->
    <div class="header-nav">
      <a href="#" @click="goToCourseDetail">课程详情</a>
      <a href="#" class="active">章节管理</a>
    </div>

    <!-- 操作按钮栏 -->
    <div class="action-bar">
      <button class="action-btn back-btn" @click="goBack">
        <i class="fas fa-arrow-left"></i> 返回课程详情
      </button>
      <button class="action-btn add-btn" @click="addChapter">
        <i class="fas fa-plus"></i> 添加章节
      </button>
      <button class="action-btn save-btn" @click="saveAllChapters">
        <i class="fas fa-save"></i>  保存更改
      </button>
    </div>

    <!-- 课程信息展示 -->
    <div v-if="courseInfo.id" class="course-info-section">
      <h2><i class="fas fa-book"></i> {{ courseInfo.courseName }}</h2>
      <div class="course-meta">
        <span><i class="fas fa-user"></i> 作者: {{ courseInfo.courseAuthor }}</span>
        <span><i class="fas fa-list"></i> 章节数量: {{ chapters.length }}</span>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>正在加载章节数据...</p>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="error-message">
      <i class="fas fa-exclamation-triangle"></i>
      <p>{{ error }}</p>
      <button @click="fetchChapters" class="retry-button">重试</button>
    </div>

    <!-- 章节列表 -->
    <div v-else class="chapter-content">
      <div v-if="chapters.length === 0" class="no-chapters">
        <i class="fas fa-video"></i>
        <p>该课程暂无章节，请添加新章节</p>
        <button class="add-first-btn" @click="addChapter">
          <i class="fas fa-plus"></i> 添加第一个章节
        </button>
      </div>


      <!-- 章节表格 -->
      <div v-else class="chapter-table-container">
        <table class="chapter-table">
          <thead>
          <tr>
            <th width="80px">序号</th>
            <th width="100px">章节ID</th>
            <th>章节名称</th>
            <th>视频文件</th>
            <th width="100px">排序</th>
            <th width="150px">操作</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="(chapter, index) in chapters" :key="chapter.id || index" class="chapter-row">
            <td>{{ index + 1 }}</td>
            <td>{{ chapter.id || '新增' }}</td>
            <td>
              <input
                  type="text"
                  v-model="chapter.name"
                  class="chapter-input"
                  placeholder="请输入章节名称"
                  @input="markAsModified(chapter)"
              >
            </td>
            <td>
              <div class="video-upload-section">
                <input
                    type="file"
                    :ref="'videoInput' + index"
                    accept="video/*"
                    @change="handleVideoUpload($event, chapter)"
                    class="video-input"
                    :id="'video-' + index"
                >
                <label :for="'video-' + index" class="video-upload-btn">
                  <i class="fas fa-upload"></i> 选择视频
                </label>
                <div v-if="chapter.videoUrl" class="video-info">
                  <i class="fas fa-video"></i>
                  <span>已上传</span>
                  <button @click="previewVideo(chapter.videoUrl)" class="preview-btn">
                    <i class="fas fa-eye"></i>预览视频
                  </button>
                </div>
                <div v-if="chapter.uploading" class="upload-status">
                  <i class="fas fa-spinner fa-spin"></i> 上传中...
                </div>
              </div>
            </td>
            <td>
              <input
                  type="number"
                  v-model="chapter.order"
                  class="order-input"
                  min="1"
                  @input="markAsModified(chapter)"
              >
            </td>
            <td>
              <div class="action-buttons">
                <button class="action-btn edit-btn" @click="editChapter(chapter)" :title="'编辑章节'">
                  <i class="fas fa-edit"></i>编辑
                </button>
                <button class="action-btn delete-btn" @click="deleteChapter(index)" :title="'删除章节'">
                  <i class="fas fa-trash"></i>删除
                </button>
                <span v-if="chapter.modified" class="modified-indicator" title="已修改">
                  <i class="fas fa-circle"></i>
                </span>
              </div>
            </td>
          </tr>
          </tbody>
        </table>
      </div>

    <!-- 编辑章节模态框 -->
    <div v-if="editingChapter" class="modal-overlay" @click.self="closeEditModal">
      <div class="edit-modal">
        <h3><i class="fas fa-edit"></i> 编辑章节</h3>

        <div class="form-group">
          <label>章节名称</label>
          <input type="text" v-model="editingChapter.name" placeholder="请输入章节名称" required>
        </div>

        <div class="form-group">
          <label>排序</label>
          <input type="number" v-model="editingChapter.order" min="1" required>
        </div>

        <div class="form-group">
          <label>视频文件</label>
          <input
              type="file"
              accept="video/*"
              @change="handleEditVideoUpload"
              class="video-input"
          >
          <div v-if="editingChapter.videoUrl" class="current-video">
            <i class="fas fa-video"></i>
            <span>当前视频已上传</span>
            <button @click="previewVideo(editingChapter.videoUrl)" class="preview-btn">
              <i class="fas fa-eye"></i> 预览
            </button>
          </div>
          <div v-if="editingChapter.uploading" class="upload-status">
            <i class="fas fa-spinner fa-spin"></i> 上传中...
          </div>
        </div>

        <div class="modal-actions">
          <button @click="closeEditModal" class="cancel-button">取消</button>
          <button @click="saveEditChapter" class="save-button">保存</button>
        </div>
      </div>
    </div>

    <!-- 删除确认模态框 -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
      <div class="delete-modal">
        <div class="warning-icon">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <h3>确认删除</h3>
        <p>确定要删除章节 <span class="chapter-highlight">{{ deleteChapterName }}</span> 吗？</p>
        <div class="modal-actions">
          <button @click="showDeleteConfirm = false" class="cancel-button">取消</button>
          <button @click="confirmDelete" class="delete-button">确认删除</button>
        </div>
      </div>
    </div>

    <!-- 视频预览模态框 -->
    <div v-if="showVideoModal" class="video-modal" @click.self="closeVideoModal">
      <div class="video-modal-content">
        <button class="close-button" @click="closeVideoModal">
          <i class="fas fa-times"></i>
        </button>
        <video
            :src="previewVideoUrl"
            controls
            class="video-player"
            autoplay
        ></video>
      </div>
    </div>

    <!-- 保存确认模态框 -->
    <div v-if="showSaveConfirm" class="modal-overlay" @click.self="showSaveConfirm = false">
      <div class="save-modal">
        <div class="info-icon">
          <i class="fas fa-save"></i>
        </div>
        <h3>保存更改</h3>
        <p>是否确认</p>
        <div class="modal-actions">
          <button @click="showSaveConfirm = false" class="cancel-button">取消</button>
          <button @click="confirmSave" class="save-button">确认保存</button>
        </div>
      </div>
    </div>
  </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';

export default {
  setup() {
    const route = useRoute();
    const router = useRouter();
    const courseId = ref(route.params.courseId);

    // 数据状态
    const loading = ref(true);
    const error = ref(null);
    const courseInfo = ref({});
    const chapters = ref([]);
    const editingChapter = ref(null);
    const showDeleteConfirm = ref(false);
    const deleteChapterIndex = ref(-1);
    const deleteChapterName = ref('');
    const showVideoModal = ref(false);
    const previewVideoUrl = ref('');
    const showSaveConfirm = ref(false);

    // 计算属性
    const modifiedCount = computed(() => {
      return chapters.value.filter(chapter => chapter.modified).length;
    });

    // 获取课程信息
    const fetchCourseInfo = async () => {
      try {
        const response = await axios.get(
            `/course/get-course-info?courseId=${courseId.value}`
        );
        if (response.data && response.data.code === 200) {
          courseInfo.value = response.data.data;
        }
      } catch (err) {
        console.error('获取课程信息失败:', err);
      }
    };

    // 获取章节列表
    const fetchChapters = async () => {
      try {
        loading.value = true;
        error.value = null;

        await fetchCourseInfo();

        const response = await axios.get(
            `/course/get-chapter?courseId=${courseId.value}`
        );

        if (response.data && response.data.code === 200) {
          chapters.value = (response.data.data || []).map(chapter => ({
            ...chapter,
            modified: false,
            uploading: false
          }));

          autoSort(); // 正确调用
        } else {
          chapters.value = [];
        }
      } catch (err) {
        console.error('获取章节数据失败:', err);
        error.value = '无法加载章节数据，请检查网络连接';
        chapters.value = [];
      } finally {
        loading.value = false;
      }
    };


    // 日期格式化
    const formatDate = (dateArray) => {
      if (Array.isArray(dateArray) && dateArray.length >= 6) {
        const [year, month, day, hour, minute] = dateArray;
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')} ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      }
      return '未知时间';
    };

    // 标记章节为已修改
    const markAsModified = (chapter) => {
      chapter.modified = true;
    };

    // 添加新章节
    const addChapter = () => {
      const newChapter = {
        id: null,
        courseId: courseId.value,
        name: '',
        videoUrl: '',
        order: chapters.value.length + 1,
        modified: true,
        uploading: false
      };
      chapters.value.push(newChapter);
    };

    // 视频上传处理
    const handleVideoUpload = async (event, chapter) => {
      const file = event.target.files[0];
      if (!file) return;

      if (!file.type.startsWith('video/')) {
        alert('请上传视频文件');
        return;
      }

      chapter.uploading = true;
      markAsModified(chapter);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await axios.post('/course/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (response.data && response.data.code === 200) {
          chapter.videoUrl = response.data.data;
          alert('视频上传成功!');
        } else {
          throw new Error(response.data?.message || '上传失败');
        }
      } catch (error) {
        console.error('视频上传失败:', error);
        alert('视频上传失败: ' + error.message);
      } finally {
        chapter.uploading = false;
        event.target.value = null;
      }
    };

    // 编辑章节
    const editChapter = (chapter) => {
      editingChapter.value = { ...chapter };
    };

    // 编辑模态框中的视频上传
    const handleEditVideoUpload = async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      if (!file.type.startsWith('video/')) {
        alert('请上传视频文件');
        return;
      }

      editingChapter.value.uploading = true;

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await axios.post('/course/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (response.data && response.data.code === 200) {
          editingChapter.value.videoUrl = response.data.data;
          alert('视频上传成功!');
        } else {
          throw new Error(response.data?.message || '上传失败');
        }
      } catch (error) {
        console.error('视频上传失败:', error);
        alert('视频上传失败: ' + error.message);
      } finally {
        editingChapter.value.uploading = false;
        event.target.value = null;
      }
    };

    // 保存编辑的章节
    const saveEditChapter = async () => {
      if (!editingChapter.value.name.trim()) {
        alert('章节名称不能为空');
        return;
      }

      const index = chapters.value.findIndex(c =>
          (c.id && c.id === editingChapter.value.id) ||
          (!c.id && c === editingChapter.value)
      );

      if (index !== -1) {
        chapters.value[index] = {
          ...editingChapter.value,
          modified: true
        };
        }


      closeEditModal();
    };

    const closeEditModal = () => {
      editingChapter.value = null;
    };

    // 删除章节
    const deleteChapter = (index) => {
      deleteChapterIndex.value = index;
      deleteChapterName.value = chapters.value[index].name || '未命名章节';
      showDeleteConfirm.value = true;
    };

    // 确认删除（仅前端操作）
    const confirmDelete = () => {
      if (deleteChapterIndex.value >= 0) {
        chapters.value.splice(deleteChapterIndex.value, 1);
        // 重新排序
        chapters.value.forEach((chapter, index) => {
          chapter.order = index + 1;
          chapter.modified = true;
        });
      }
      showDeleteConfirm.value = false;
      deleteChapterIndex.value = -1;
    };

    // 视频预览
    const previewVideo = (videoUrl) => {
      previewVideoUrl.value = videoUrl;
      showVideoModal.value = true;
    };

    const closeVideoModal = () => {
      showVideoModal.value = false;
      previewVideoUrl.value = '';
    };

    // 保存所有章节
    const saveAllChapters = () => {
      if (modifiedCount.value === 0) {
        alert('没有需要保存的更改');
        return;
      }

      // 验证所有章节
      for (const chapter of chapters.value) {
        if (!chapter.name.trim()) {
          alert('所有章节都必须有名称');
          return;
        }
        if (!chapter.videoUrl) {
          alert('所有章节都必须上传视频');
          return;
        }
      }

      showSaveConfirm.value = true;
    };

    const confirmSave = async () => {
      try {
        const chaptersData = chapters.value.map(chapter => ({
          name: chapter.name,
          videoUrl: chapter.videoUrl,
          order: chapter.order
        }));

        const response = await axios.post('/course/add-update-course', {
          courseId: courseId.value,
          chapters: chaptersData
        });

        if (response.data && response.data.code === 200) {
          alert('章节保存成功！');
          await fetchChapters(); // 重新加载数据
        } else {
          throw new Error(response.data?.message || '保存失败');
        }

        await axios.post('/course/add-update-course', {
          courseId: courseId.value,
          chapters: chaptersData
        });
      } catch (err) {
        console.error('保存章节失败:', err);
        alert('保存章节失败: ' + err.message);
      } finally {
        showSaveConfirm.value = false;
      }
    };

    // 批量操作
    const autoSort = () => {
      chapters.value.forEach((chapter, index) => {
        chapter.order = index + 1;
        chapter.modified = true;
      });
    };

    const clearAllChapters = () => {
      if (confirm('确定要清空所有章节吗？此操作不可恢复！')) {
        chapters.value = [];
      }
    };

    const importChapters = () => {
      alert('批量导入功能开发中...');
    };

    // 导航方法
    const goBack = () => {
      router.push({ name: 'CourseDetail', params: { id: courseId.value } });
    };

    const goToHome = () => {
      router.push({ name: 'RoleSelect' });
    };

    const goToCourseList = () => {
      router.push({ name: 'CourseList' });
    };

    const goToCourseDetail = () => {
      router.push({ name: 'CourseDetail', params: { id: courseId.value } });
    };

    onMounted(() => {
      fetchChapters();
    });

    return {
      loading,
      error,
      courseInfo,
      chapters,
      editingChapter,
      showDeleteConfirm,
      deleteChapterIndex,
      deleteChapterName,
      showVideoModal,
      previewVideoUrl,
      showSaveConfirm,
      modifiedCount,
      fetchChapters,
      formatDate,
      markAsModified,
      addChapter,
      handleVideoUpload,
      editChapter,
      handleEditVideoUpload,
      saveEditChapter,
      closeEditModal,
      deleteChapter,
      confirmDelete,
      previewVideo,
      closeVideoModal,
      saveAllChapters,
      confirmSave,
      autoSort,
      clearAllChapters,
      goBack,
      goToHome,
      goToCourseList,
      goToCourseDetail
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

.chapter-detail {
  max-width: 1400px;
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
  flex-wrap: wrap;
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

.add-btn {
  background: linear-gradient(to bottom, #28a745, #218838);
}

.add-btn:hover {
  background: linear-gradient(to bottom, #218838, #1c7430);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(40,167,69,0.3);
}

.save-btn {
  background: linear-gradient(to bottom, #007bff, #0069d9);
}

.save-btn:hover {
  background: linear-gradient(to bottom, #0069d9, #005cbf);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,123,255,0.3);
}

/* 课程信息区域 */
.course-info-section {
  padding: 20px;
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  border-radius: 8px;
  margin: 20px 0;
  border-left: 4px solid #007bff;
  box-shadow: 0 4px 8px rgba(0,0,0,0.05);
}

.course-info-section h2 {
  font-size: 24px;
  color: #2c3e50;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.course-meta {
  display: flex;
  gap: 20px;
  color: #6c757d;
  font-size: 14px;
  flex-wrap: wrap;
}

.course-meta span {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 章节内容区域 */
.chapter-content {
  padding: 20px 0;
}

.no-chapters {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  padding: 40px;
  background: #f8f9fa;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 4px 8px rgba(0,0,0,0.05);
}

.no-chapters i {
  font-size: 48px;
  color: #6c757d;
  margin-bottom: 20px;
}

.no-chapters p {
  font-size: 16px;
  color: #6c757d;
  margin-bottom: 20px;
}

.add-first-btn {
  padding: 12px 24px;
  background: linear-gradient(to bottom, #28a745, #218838);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s;
  box-shadow: 0 2px 5px rgba(40,167,69,0.2);
}

.add-first-btn:hover {
  background: linear-gradient(to bottom, #218838, #1c7430);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(40,167,69,0.3);
}

/* 章节表格 */
.chapter-table-container {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 6px 15px rgba(0,0,0,0.08);
}

.chapter-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 14px;
  border-radius: 8px;
}

.chapter-table th,
.chapter-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #dee2e6;
}

.chapter-table th {
  background: linear-gradient(to bottom, #f1f5f9, #e2e8f0);
  font-weight: 600;
  color: #495057;
  position: sticky;
  top: 0;
  z-index: 10;
}

.chapter-row:hover {
  background-color: #f8fafc;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.05);
}

.chapter-input, .order-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #ced4da;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.3s;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);
}

.chapter-input:focus, .order-input:focus {
  border-color: #007bff;
  outline: none;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);
}

.order-input {
  width: 80px;
  text-align: center;
}

/* 视频上传区域 */
.video-upload-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.video-input {
  display: none;
}

.video-upload-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: linear-gradient(to bottom, #17a2b8, #138496);
  color: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.3s;
  width: fit-content;
  box-shadow: 0 2px 4px rgba(23,162,184,0.2);
}

.video-upload-btn:hover {
  background: linear-gradient(to bottom, #138496, #117a8b);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(23,162,184,0.3);
}

.video-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #28a745;
  font-size: 13px;
}

.preview-btn {
  padding: 4px 8px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.3s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.preview-btn:hover {
  background: #5a6268;
  transform: translateY(-2px);
  box-shadow: 0 3px 6px rgba(0,0,0,0.15);
}

.upload-status {
  color: #007bff;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  align-items: center;
  gap: 6px; /* 减小按钮间距 */
}

/* 统一操作按钮样式 */
.edit-btn, .delete-btn {
  padding: 6px 10px; /* 减小内边距使按钮更紧凑 */
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px; /* 减小字体大小 */
  transition: all 0.3s;
  display: inline-flex;
  align-items: center;
  gap: 4px; /* 减小图标和文字间距 */
  box-shadow: 0 1px 2px rgba(0,0,0,0.1); /* 更柔和的阴影 */
  font-weight: 500;
}

/* 优化编辑按钮 */
.edit-btn {
  background: linear-gradient(to bottom, #4da8ff, #007bff); /* 更明亮的蓝色 */
  color: white; /* 改为白色文字 */
}

.edit-btn:hover {
  background: linear-gradient(to bottom, #007bff, #0069d9);
  transform: translateY(-1px); /* 减小悬停上移距离 */
  box-shadow: 0 2px 4px rgba(0,123,255,0.3);
}

/* 优化删除按钮 */
.delete-btn {
  background: linear-gradient(to bottom, #ff6b6b, #dc3545); /* 更明亮的红色 */
  color: white;
}

.delete-btn:hover {
  background: linear-gradient(to bottom, #dc3545, #c82333);
  transform: translateY(-1px); /* 减小悬停上移距离 */
  box-shadow: 0 2px 4px rgba(220,53,69,0.3);
}

/* 优化视频上传按钮 */
.video-upload-btn {
  padding: 6px 12px; /* 减小内边距 */
  background: linear-gradient(to bottom, #20c997, #17a2b8); /* 更清新的青色 */
  border-radius: 4px;
  font-size: 12px; /* 减小字体大小 */
  box-shadow: 0 1px 2px rgba(23,162,184,0.2);
}

/* 优化预览按钮 */
.preview-btn {
  padding: 4px 8px;
  background: linear-gradient(to bottom,rgba(23,162,184,0.2),rgba(23,162,184,0.2)); /* 灰色渐变 */
  font-size: 11px; /* 减小字体大小 */
  border-radius: 3px; /* 减小圆角 */
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

.preview-btn:hover {
  background: linear-gradient(to bottom,rgba(23,162,184,0.2),rgba(23,162,184,0.2));
  transform: translateY(-1px); /* 减小悬停上移距离 */
}

/* 优化修改指示器 */
.modified-indicator {
  color: #28a745;
  font-size: 10px; /* 稍大一点 */
  margin-left: 4px; /* 增加左边距 */
  animation: pulse 1.5s infinite; /* 加快动画速度 */
}

/* 优化视频信息区域 */
.video-info {
  display: flex;
  align-items: center;
  gap: 6px; /* 减小间距 */
  font-size: 12px; /* 减小字体大小 */
  margin-top: 4px; /* 增加上边距 */
}

/* 调整操作列宽度 */
.chapter-table th:nth-child(6),
.chapter-table td:nth-child(6) {
  width: 130px; /* 减小操作列宽度 */
}

/* 优化表格行悬停效果 */
.chapter-row:hover {
  background-color: #f5f9ff; /* 更淡的蓝色背景 */
}

/* 调整按钮图标大小 */
.action-btn i {
  font-size: 11px; /* 减小图标大小 */
}
@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

/* 批量操作区域 */
.batch-operations {
  margin-top: 30px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #dee2e6;
  box-shadow: 0 4px 8px rgba(0,0,0,0.05);
}

.batch-operations h3 {
  font-size: 18px;
  color: #2c3e50;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.batch-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.batch-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: #fff;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s;
  font-weight: 500;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
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

.edit-modal, .delete-modal, .save-modal {
  background: #fff;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  padding: 30px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
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

.edit-modal h3, .delete-modal h3, .save-modal h3 {
  font-size: 20px;
  color: #2c3e50;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 表单样式 */
.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #34495e;
}

.form-group input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.3s;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);
}

.form-group input:focus {
  border-color: #007bff;
  outline: none;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);
}

.current-video {
  margin-top: 10px;
  padding: 10px 14px;
  background: #e8f5e9;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #28a745;
  font-size: 14px;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);
}

/* 模态框按钮 */
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

.cancel-button, .save-button, .delete-button {
  padding: 10px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
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

.save-button {
  background: linear-gradient(to bottom, #007bff, #0069d9);
  color: white;
  border: none;
}

.save-button:hover {
  background: linear-gradient(to bottom, #0069d9, #005cbf);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,123,255,0.3);
}

.delete-button {
  background: linear-gradient(to bottom, #dc3545, #c82333);
  color: white;
  border: none;
}

.delete-button:hover {
  background: linear-gradient(to bottom, #c82333, #bd2130);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(220,53,69,0.3);
}

/* 图标样式 */
.warning-icon, .info-icon {
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

.info-icon i {
  font-size: 48px;
  color: #007bff;
  background: rgba(0, 123, 255, 0.1);
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 8px rgba(0,123,255,0.2);
}

.chapter-highlight, .count-highlight {
  color: #007bff;
  font-weight: 600;
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
  z-index: 3000;
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

/* 加载和错误状态 */
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
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
  min-height: 300px;
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

/* 响应式设计 */
@media (max-width: 768px) {
  .action-bar {
    flex-direction: column;
    gap: 8px;
  }

  .course-meta {
    flex-direction: column;
    gap: 8px;
  }

  .chapter-table-container {
    overflow-x: auto;
  }

  .chapter-table {
    min-width: 800px;
  }

  .edit-modal {
    width: 95%;
    padding: 20px;
  }
}

@media (max-width: 480px) {
  .chapter-detail {
    padding: 0 10px;
  }

  .course-info-section {
    padding: 15px;
  }

  .course-info-section h2 {
    font-size: 20px;
  }

  .chapter-table th,
  .chapter-table td {
    padding: 8px 10px;
  }

  .action-btn {
    padding: 8px 14px;
    font-size: 12px;
  }
}

@media (max-width: 768px) {
  .edit-btn, .delete-btn {
    padding: 5px 8px;
    font-size: 11px;
  }

  .video-upload-btn {
    padding: 5px 10px;
    font-size: 11px;
  }
}


</style>