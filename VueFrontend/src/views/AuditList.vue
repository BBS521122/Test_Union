<template>
  <div class="audit-container">
    <!-- 顶部导航栏 -->
    <div class="header-nav">
      <a href="#" class="active">课程审核</a>
    </div>

    <!-- 搜索区域 -->
    <div class="search-section">
      <div class="search-row">
        <label class="search-label" for="courseName">课程名称：</label>
        <input
            type="text"
            class="search-input"
            id="courseName"
            placeholder="请输入课程名称"
            v-model="searchQuery"
            @keyup.enter="handleSearch"
        >

        <label class="search-label" for="author">作者：</label>
        <input
            type="text"
            class="search-input"
            id="author"
            placeholder="请输入作者"
            v-model="authorQuery"
            @keyup.enter="handleSearch"
        >

        <button class="search-btn" @click="handleSearch">搜索</button>
        <button class="reset-btn" @click="resetSearch">重置</button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>正在加载待审核课程...</p>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="error-message">
      <i class="fas fa-exclamation-triangle"></i>
      <p>{{ error }}</p>
      <button @click="fetchPendingCourses" class="retry-button">重试</button>
    </div>

    <!-- 待审核课程列表 -->
    <div v-else>
      <div v-if="displayedCourses.length === 0" class="no-courses">
        <i class="fas fa-check-circle"></i>
        <p>没有待审核的课程</p>
      </div>

      <table v-else class="course-table">
        <thead>
        <tr>
          <th>序号</th>
          <th>课程名称</th>
          <th>作者</th>
          <th>简介</th>
          <th>排序</th>
          <th>提交时间</th>
          <th>操作</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="(course, index) in paginatedCourses" :key="course.id">
          <td>{{ (currentPage - 1) * itemsPerPage + index + 1 }}</td>
          <td class="course-title">{{ course.courseName }}</td>
          <td>{{ course.courseAuthor || '未知' }}</td>
          <td class="course-description">{{ course.courseDescription || '暂无简介' }}</td>
          <td>{{ course.courseSort }}</td>
          <td>{{ formatDate(course.courseCreateTime) }}</td>
          <td>
            <button class="action-btn approve-btn" @click="approveCourse(course.id)">
              <i class="fas fa-check"></i> 通过
            </button>
            <button class="action-btn reject-btn" @click="rejectCourse(course.id)">
              <i class="fas fa-times"></i> 拒绝
            </button>
          </td>
        </tr>
        </tbody>
      </table>

      <!-- 分页控件 -->
      <div class="pagination-section" v-if="totalPages > 1">
        <span>共 {{ displayedCourses.length }} 条</span>
        <select v-model="itemsPerPage" @change="currentPage = 1">
          <option value="5">5条/页</option>
          <option value="10">10条/页</option>
          <option value="20">20条/页</option>
        </select>
        <button
            class="pagination-btn"
            @click="currentPage = currentPage - 1"
            :disabled="currentPage === 1"
        >«</button>
        <button
            v-for="page in visiblePages"
            :key="page"
            class="pagination-btn"
            :class="{ active: page === currentPage }"
            @click="currentPage = page"
        >{{ page }}</button>
        <button
            class="pagination-btn"
            @click="currentPage = currentPage + 1"
            :disabled="currentPage >= totalPages"
        >»</button>
        前往
        <input
            type="text"
            class="pagination-input"
            v-model="goToPage"
            @keyup.enter="goToSpecificPage"
            size="3"
        >
        页
      </div>
    </div>

    <!-- 审核确认模态框 -->
    <div v-if="showConfirmModal" class="modal-overlay" @click.self="showConfirmModal = false">
      <div class="confirm-modal">
        <div class="modal-icon">
          <i :class="confirmAction === 'approve' ? 'fas fa-check-circle' : 'fas fa-times-circle'"></i>
        </div>
        <h3>{{ confirmAction === 'approve' ? '确认通过' : '确认拒绝' }}</h3>
        <p>确定要{{ confirmAction === 'approve' ? '通过' : '拒绝' }}课程
          <span class="course-highlight">{{ confirmCourse?.courseName }}</span> 吗？</p>
        <div class="modal-actions">
          <button @click="showConfirmModal = false" class="cancel-button">取消</button>
          <button @click="confirmAudit"
                  :class="confirmAction === 'approve' ? 'approve-button' : 'reject-button'">
            确认{{ confirmAction === 'approve' ? '通过' : '拒绝' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';

export default {
  setup() {
    const router = useRouter();

    // 数据状态
    const loading = ref(true);
    const error = ref(null);
    const pendingCourses = ref([]);
    const displayedCourses = ref([]);
    const currentPage = ref(1);
    const itemsPerPage = ref(10);
    const searchQuery = ref("");
    const authorQuery = ref("");
    const goToPage = ref(1);

    // 审核确认相关
    const showConfirmModal = ref(false);
    const confirmAction = ref('');
    const confirmCourse = ref(null);

    // 计算属性
    const totalPages = computed(() => {
      return Math.ceil(displayedCourses.value.length / itemsPerPage.value);
    });

    const visiblePages = computed(() => {
      const pages = [];
      const maxVisible = 5;
      let start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2));
      let end = Math.min(totalPages.value, start + maxVisible - 1);

      if (end - start < maxVisible - 1) {
        start = Math.max(1, end - maxVisible + 1);
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      return pages;
    });

    const paginatedCourses = computed(() => {
      const startIndex = (currentPage.value - 1) * itemsPerPage.value;
      const endIndex = startIndex + parseInt(itemsPerPage.value);
      return displayedCourses.value.slice(startIndex, endIndex);
    });

    // 获取待审核课程
    const fetchPendingCourses = async () => {
      try {
        loading.value = true;
        error.value = null;

        // 修改为直接调用待审核课程接口
        const response = await axios.get('/course/getPendingCourses');

        if (response.data) {
          pendingCourses.value = response.data;
          displayedCourses.value = [...pendingCourses.value];
          currentPage.value = 1;
        } else {
          throw new Error('获取待审核课程失败');
        }
      } catch (err) {
        console.error('获取待审核课程失败:', err);
        error.value = '无法加载待审核课程，请检查网络连接或后端服务';
      } finally {
        loading.value = false;
      }
    };

    // 搜索功能
    const handleSearch = () => {
      let result = [...pendingCourses.value];

      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        result = result.filter(course =>
            course.courseName && course.courseName.toLowerCase().includes(query)
        );
      }

      if (authorQuery.value) {
        const query = authorQuery.value.toLowerCase();
        result = result.filter(course =>
            course.courseAuthor && course.courseAuthor.toLowerCase().includes(query)
        );
      }

      displayedCourses.value = result;
      currentPage.value = 1;
    };

    const resetSearch = () => {
      searchQuery.value = "";
      authorQuery.value = "";
      displayedCourses.value = [...pendingCourses.value];
      currentPage.value = 1;
    };

    // 分页功能
    const goToSpecificPage = () => {
      const pageNum = parseInt(goToPage.value);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages.value) {
        currentPage.value = pageNum;
      } else {
        alert(`请输入1到${totalPages.value}之间的有效页码`);
      }
      goToPage.value = "";
    };

    // 审核操作
    const approveCourse = (courseId) => {
      const course = pendingCourses.value.find(c => c.id === courseId);
      if (course) {
        confirmCourse.value = course;
        confirmAction.value = 'approve';
        showConfirmModal.value = true;
      }
    };

    const rejectCourse = (courseId) => {
      const course = pendingCourses.value.find(c => c.id === courseId);
      if (course) {
        confirmCourse.value = course;
        confirmAction.value = 'reject';
        showConfirmModal.value = true;
      }
    };

    const confirmAudit = async () => {
      try {
        const courseId = confirmCourse.value.id;
        const action = confirmAction.value;

        // 根据操作类型选择不同的API端点
        const url = action === 'approve'
            ? '/course/approveCourse'
            : '/course/rejectCourse';

        // 确保传递整数类型的courseId
        const response = await axios.post(url, {
          courseId: parseInt(courseId)
        });

        if (response.data && response.data.success) {
          alert(`课程${action === 'approve' ? '通过' : '拒绝'}成功！`);
          await fetchPendingCourses();
        } else {
          throw new Error(response.data?.message || '审核操作失败');
        }
      } catch (err) {
        console.error('审核操作失败:', err);
        alert('审核操作失败: ' + err.message);
      } finally {
        showConfirmModal.value = false;
        confirmCourse.value = null;
        confirmAction.value = '';
      }
    };

    // 日期格式化
    const formatDate = (dateArray) => {
      if (Array.isArray(dateArray) && dateArray.length >= 6) {
        const [year, month, day, hour, minute, second] = dateArray;
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')} ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`;
      }
      return '未知时间';
    };

    onMounted(() => {
      fetchPendingCourses();
    });

    return {
      loading,
      error,
      pendingCourses,
      displayedCourses,
      currentPage,
      itemsPerPage,
      totalPages,
      visiblePages,
      paginatedCourses,
      searchQuery,
      authorQuery,
      goToPage,
      showConfirmModal,
      confirmAction,
      confirmCourse,
      fetchPendingCourses,
      handleSearch,
      resetSearch,
      goToSpecificPage,
      approveCourse,
      rejectCourse,
      confirmAudit,
      formatDate
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

.audit-container {
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

/* 搜索区域 */
.search-section {
  padding: 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #e5e5e5;
  border-radius: 0 0 10px 10px;
}

.search-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.search-label {
  margin-right: 8px;
  font-size: 15px;
  color: #495057;
  font-weight: 500;
}

.search-input {
  width: 200px;
  padding: 10px 14px;
  border: 1px solid #ced4da;
  border-radius: 6px;
  font-size: 15px;
  transition: all 0.3s;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);
}

.search-input:focus {
  border-color: #007bff;
  outline: none;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);
}

.search-btn {
  padding: 10px 24px;
  background: linear-gradient(to bottom, #007bff, #0069d9);
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 500;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

.search-btn:hover {
  background: linear-gradient(to bottom, #0069d9, #005cbf);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.reset-btn {
  padding: 10px 24px;
  background: linear-gradient(to bottom, #f8f9fa, #e9ecef);
  color: #495057;
  border: 1px solid #ced4da;
  border-radius: 6px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 500;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}

.reset-btn:hover {
  background: linear-gradient(to bottom, #e9ecef, #dde1e6);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

/* 表格样式 */
.course-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  margin: 20px 0;
  border: 1px solid #dee2e6;
  font-size: 15px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.course-table th,
.course-table td {
  border: 1px solid #dee2e6;
  padding: 14px 16px;
  text-align: left;
}

.course-table th {
  background: linear-gradient(to bottom, #f1f5f9, #e2e8f0);
  font-weight: 600;
  color: #495057;
}

.course-table tbody tr:nth-child(even) {
  background-color: #f8fafc;
}

.course-table tbody tr:hover {
  background-color: #f0f7ff;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.05);
}

.course-title {
  font-weight: 600;
  color: #007bff;
}

.course-description {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 操作按钮 */
.action-btn {
  padding: 8px 14px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: #fff;
  font-size: 14px;
  margin-right: 8px;
  transition: all 0.3s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

.approve-btn {
  background: linear-gradient(to bottom, #28a745, #218838);
}

.approve-btn:hover {
  background: linear-gradient(to bottom, #218838, #1c7430);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(40,167,69,0.3);
}

.reject-btn {
  background: linear-gradient(to bottom, #dc3545, #c82333);
}

.reject-btn:hover {
  background: linear-gradient(to bottom, #c82333, #bd2130);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(220,53,69,0.3);
}

/* 分页区域 */
.pagination-section {
  padding: 16px;
  border-top: 1px solid #e5e5e5;
  text-align: right;
  font-size: 15px;
  color: #495057;
  background: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  border-radius: 0 0 10px 10px;
}

.pagination-section select {
  padding: 8px 12px;
  margin: 0 8px;
  border: 1px solid #ced4da;
  border-radius: 6px;
  background: #fff;
  font-size: 15px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.pagination-btn {
  padding: 8px 14px;
  margin: 0 4px;
  border: 1px solid #ced4da;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  font-size: 15px;
  transition: all 0.3s;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.pagination-btn:hover:not(:disabled) {
  background: #e9ecef;
  transform: translateY(-2px);
}

.pagination-btn.active {
  background: #007bff;
  color: #fff;
  border-color: #007bff;
  box-shadow: 0 2px 4px rgba(0,123,255,0.3);
}

.pagination-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.pagination-input {
  width: 50px;
  padding: 8px;
  margin: 0 4px;
  border: 1px solid #ced4da;
  border-radius: 6px;
  text-align: center;
  font-size: 15px;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);
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

.confirm-modal {
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

.modal-icon {
  text-align: center;
  margin-bottom: 20px;
}

.modal-icon i {
  font-size: 48px;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.modal-icon .fa-check-circle {
  color: #28a745;
  background: rgba(40, 167, 69, 0.1);
}

.modal-icon .fa-times-circle {
  color: #dc3545;
  background: rgba(220, 53, 69, 0.1);
}

.confirm-modal h3 {
  font-size: 22px;
  color: #2c3e50;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
}

.confirm-modal p {
  color: #7f8c8d;
  margin-bottom: 30px;
  font-size: 16px;
  line-height: 1.6;
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

.cancel-button {
  background: #f5f7fa;
  color: #606266;
  border: 1px solid #dcdfe6;
  padding: 10px 25px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
  transition: all 0.3s;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

.cancel-button:hover {
  background: #e6e9ed;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.approve-button {
  background: linear-gradient(135deg, #28a745, #218838);
  color: white;
  border: none;
  padding: 10px 25px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
  transition: all 0.3s;
  box-shadow: 0 2px 5px rgba(40,167,69,0.2);
}

.approve-button:hover {
  background: linear-gradient(135deg, #218838, #1e7e34);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(40,167,69,0.3);
}

.reject-button {
  background: linear-gradient(135deg, #dc3545, #c82333);
  color: white;
  border: none;
  padding: 10px 25px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
  transition: all 0.3s;
  box-shadow: 0 2px 5px rgba(220,53,69,0.2);
}

.reject-button:hover {
  background: linear-gradient(135deg, #c82333, #bd2130);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(220,53,69,0.3);
}

/* 加载和错误状态 */
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 50px;
  min-height: 300px;
  background: #f8f9fa;
  border-radius: 8px;
  margin: 30px 0;
  box-shadow: 0 4px 8px rgba(0,0,0,0.05);
}

.spinner {
  width: 60px;
  height: 60px;
  border: 6px solid rgba(52, 152, 219, 0.2);
  border-top: 6px solid #3498db;
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
  padding: 30px;
  text-align: center;
  background: #f8f9fa;
  border-radius: 8px;
  margin: 30px 0;
  font-size: 16px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.05);
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

.no-courses {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  padding: 30px;
  background: #f8f9fa;
  border-radius: 8px;
  margin: 30px 0;
  font-size: 16px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.05);
}

.no-courses i {
  font-size: 48px;
  color: #28a745;
  margin-bottom: 20px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .search-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .search-input {
    width: 100%;
    margin-bottom: 10px;
  }

  .course-table {
    font-size: 14px;
  }

  .course-table th,
  .course-table td {
    padding: 10px 12px;
  }

  .course-description {
    max-width: 150px;
  }

  .action-btn {
    padding: 6px 10px;
    font-size: 12px;
    margin-right: 4px;
  }

  .pagination-section {
    flex-wrap: wrap;
    justify-content: center;
  }

  .cancel-button, .approve-button, .reject-button {
    padding: 8px 20px;
    font-size: 14px;
  }
}
</style>