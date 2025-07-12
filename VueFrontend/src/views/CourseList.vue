<template>
  <div class="course-container">
    <!-- 顶部导航栏 -->
    <div class="header-nav">
      <a href="#" class="active">课程管理</a>
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

        <label class="search-label" for="courseSort">课程排序：</label>
        <input
            type="text"
            class="search-input"
            id="courseSort"
            placeholder="请输入课程排序"
            v-model="sortQuery"
            @keyup.enter="handleSearch"
        >

        <button class="search-btn" @click="handleSearch">搜索</button>
        <button class="reset-btn" @click="resetSearch">重置</button>
      </div>
    </div>

    <!-- 操作按钮区 -->
    <div class="action-bar">
      <button class="action-btn add-btn" @click="addCourse">新增</button>
      <button class="action-btn edit-btn" @click="showUpdateModal">修改</button>
      <button class="action-btn del-btn" @click="showDeleteModal">删除</button>
      <button class="action-btn export-btn" @click="showExportConfirmDialog">导出</button>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>正在加载课程数据...</p>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="error-message">
      <i class="fas fa-exclamation-triangle"></i>
      <p>{{ error }}</p>
      <button @click="fetchCourses" class="retry-button">重试</button>
    </div>

    <!-- 课程列表 -->
    <div v-else>
      <div v-if="displayedCourses.length === 0" class="no-courses">
        <i class="fas fa-book-open"></i>
        <p>没有找到课程，请添加新课程</p>
      </div>

      <!-- 课程表格 -->
      <table v-else class="course-table">
        <thead>
        <tr>
          <th width="50px">选择</th>
          <th>序号</th>
          <th>课程名称</th>
          <th>作者</th>
          <th>课程简介</th>
          <th>排序</th>
          <th>审核状态</th>
          <th>操作</th>
        </tr>
        </thead>
        <tbody>
        <tr
            v-for="(course, index) in paginatedCourses"
            :key="course.id"
            class="course-row"
            @click="goToCourseDetail(course.id)"
        >
          <td @click.stop>
            <input
                type="checkbox"
                v-model="selectedCourses"
                :value="course.id"
            />
          </td>
          <td>{{ (currentPage - 1) * itemsPerPage + index + 1 }}</td>
          <td class="course-title">{{ course.courseName }}</td>
          <td>{{ course.courseAuthor || '未知' }}</td>
          <td class="course-description">{{ course.courseDescription || '暂无简介' }}</td>
          <td>{{ course.courseSort }}</td>
          <td>
              <span :class="'audit-status-' + (course.state || 0)">
                {{ getAuditStatusText(course.state) }}
              </span>
          </td>
          <td @click.stop>
            <button class="action-btn view-btn" @click="goToCourseDetail(course.id)">
              <i class="fas fa-eye"></i> 查看
            </button>
          </td>
        </tr>
        </tbody>
      </table>

      <!-- 分页控件 -->
      <div class="pagination-section" v-if="totalPages > 1">
        <span>共 {{ displayedCourses.length }} 条</span>
        <select v-model="itemsPerPage" @change="currentPage = 1">
          <option value="4">4条/页</option>
          <option value="8">8条/页</option>
          <option value="12">12条/页</option>
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

    <!-- 删除确认模态框 -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
      <div class="delete-modal">
        <div class="warning-icon">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <h3>确认删除</h3>
        <p>确定要删除选中的 <span class="count-highlight">{{ selectedCourses.length }}</span> 门课程吗？</p>
        <div class="modal-actions">
          <button @click="showDeleteConfirm = false" class="cancel-button">取消</button>
          <button @click="confirmDelete" class="delete-button">确认删除</button>
        </div>
      </div>
    </div>

    <!-- 修改确认模态框 -->
    <div v-if="showUpdateConfirm" class="modal-overlay" @click.self="showUpdateConfirm = false">
      <div class="update-modal">
        <h3>修改课程</h3>
        <p>正在修改: <span class="count-highlight">{{ updatingCourse.courseName }}</span></p>

        <div class="form-container">
          <div class="form-group">
            <label>课程名称</label>
            <input type="text" v-model="updatingCourse.courseName" required>
          </div>

          <div class="form-group">
            <label>课程描述</label>
            <textarea v-model="updatingCourse.courseDescription"></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>作者</label>
              <input type="text" v-model="updatingCourse.courseAuthor">
            </div>
            <div class="form-group">
              <label>排序</label>
              <input type="number" v-model="updatingCourse.courseSort">
            </div>
          </div>

          <div class="form-group">
            <label>封面图片</label>
            <input
                type="file"
                ref="coverInput"
                accept="image/*"
                @change="handleUpdateCover"
            >
            <div v-if="updateCoverPreview" class="cover-preview">
              <img :src="updateCoverPreview" alt="封面预览">
            </div>
            <div v-else-if="updatingCourse.coverUrl" class="cover-preview">
              <img :src="updatingCourse.coverUrl" alt="当前封面">
            </div>
          </div>

          <div class="modal-actions">
            <button @click="showUpdateConfirm = false" class="cancel-button">取消</button>
            <button @click="confirmUpdate" class="update-button">确认修改</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 编辑课程模态框 -->
    <div v-if="editingCourse" class="modal-overlay" @click.self="closeEditModal">
      <div class="edit-modal">
        <h2>{{ editingCourse.id ? '编辑课程' : '添加新课程' }}</h2>

        <form @submit.prevent="saveCourse">
          <div class="form-group">
            <label>课程名称</label>
            <input type="text" v-model="editingCourse.courseName" required>
          </div>

          <div class="form-group">
            <label>课程描述</label>
            <textarea v-model="editingCourse.courseDescription" rows="3"></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>作者</label>
              <input type="text" v-model="editingCourse.courseAuthor">
            </div>

            <div class="form-group">
              <label>排序</label>
              <input type="number" v-model="editingCourse.courseSort">
            </div>
          </div>

          <div class="form-group">
            <label>封面图片</label>
            <input
                type="file"
                accept="image/*"
                @change="handleCoverUpload"
            >
            <div v-if="uploadingCover" class="upload-status">
              <i class="fas fa-spinner fa-spin"></i> 上传中...
            </div>
            <div v-if="coverPreview" class="preview-container">
              <img :src="coverPreview" alt="封面预览" class="cover-preview">
            </div>
            <div v-if="editingCourse.coverUrl" class="uploaded-url">
              <i class="fas fa-check-circle"></i> 已上传封面
            </div>
          </div>

          <div class="form-actions">
            <button type="button" @click="closeEditModal" class="cancel-button">取消</button>
            <button type="submit" class="save-button">保存课程</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 导出确认模态框 -->
    <div v-if="showExportConfirm" class="modal-overlay" @click.self="showExportConfirm = false">
      <div class="export-modal">
        <div class="info-icon">
          <i class="fas fa-file-export"></i>
        </div>
        <h3>确认导出</h3>
        <p>确定要导出 <span class="count-highlight">全部 {{ displayedCourses.length }} 门</span> 课程数据吗？</p>
        <div class="modal-actions">
          <button @click="showExportConfirm = false" class="cancel-button">取消</button>
          <button @click="confirmExport" class="export-button">确认导出</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import CourseDetail from '@/views/CourseDetail.vue';

export default {
  setup() {
    const router = useRouter();

    // 添加审核状态文本映射
    const getAuditStatusText = (state) => {
      return {
        0: '未审核',
        1: '已通过',
        2: '已拒绝'
      }[state] || '未知状态';
    };


    // 数据状态
    const loading = ref(true);
    const error = ref(null);
    const courses = ref([]);
    const displayedCourses = ref([]);
    const currentPage = ref(1);
    const itemsPerPage = ref(4);
    const searchQuery = ref("");
    const authorQuery = ref("");
    const sortQuery = ref("");
    const goToPage = ref(1);
    const selectedCourses = ref([]);
    const showDeleteConfirm = ref(false);
    const showUpdateConfirm = ref(false);
    const updatingCourse = ref(null);
    const updateCoverFile = ref(null);
    const coverInput = ref(null);
    const showExportConfirm = ref(false);

    // 文件上传相关状态
    const uploadingCover = ref(false);
    const coverPreview = ref(null);

    // 修改课程的封面预览（单独变量）
    const updateCoverPreview = ref(null);

    // 编辑状态
    const editingCourse = ref(null);

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

    // 获取课程数据
    const fetchCourses = async () => {
      try {
        loading.value = true;
        error.value = null;
        const response = await axios.get('/course/get-all-course');

        if (response.data && response.data.code === 200) {
          courses.value = response.data.data || [];
          displayedCourses.value = [...courses.value];
          currentPage.value = 1;
        } else {
          throw new Error(response.data?.message || '获取课程数据失败');
        }
      } catch (err) {
        console.error('获取课程数据失败:', err);
        error.value = '无法加载课程数据，请检查网络连接或后端服务';
      } finally {
        loading.value = false;
      }
    };

    // 搜索功能
    const handleSearch = () => {
      let result = [...courses.value];

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

      if (sortQuery.value) {
        const query = sortQuery.value.toLowerCase();
        result = result.filter(course =>
            course.courseSort !== undefined && course.courseSort.toString().includes(query)
        );
      }

      displayedCourses.value = result;
      currentPage.value = 1;
    };

    const resetSearch = () => {
      searchQuery.value = "";
      authorQuery.value = "";
      sortQuery.value = "";
      displayedCourses.value = [...courses.value];
      currentPage.value = 1;
    };

    const goToSpecificPage = () => {
      const pageNum = parseInt(goToPage.value);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages.value) {
        currentPage.value = pageNum;
      } else {
        alert(`请输入1到${totalPages.value}之间的有效页码`);
      }
      goToPage.value = "";
    };

    // 跳转到课程详情的方法
    const goToCourseDetail = (courseId) => {
      router.push({ name: 'CourseDetail', params: { id: courseId } });
    };

    // 显示修改模态框
    const showUpdateModal = () => {
      if (selectedCourses.value.length !== 1) {
        alert('请选择一门课程进行修改');
        return;
      }

      const courseId = selectedCourses.value[0];
      const courseToUpdate = courses.value.find(c => c.id === courseId);

      if (courseToUpdate) {
        updatingCourse.value = { ...courseToUpdate };
        updateCoverPreview.value = courseToUpdate.coverUrl;
        updateCoverFile.value = null;
        showUpdateConfirm.value = true;
      } else {
        alert('未找到课程信息');
      }
    };

    // 封面更新处理
    const handleUpdateCover = (event) => {
      const file = event.target.files[0];
      if (!file) return;

      updateCoverFile.value = file;

      const reader = new FileReader();
      reader.onload = (e) => {
        updateCoverPreview.value = e.target.result;
      };
      reader.readAsDataURL(file);
    };

    // 确认修改方法
    const confirmUpdate = async () => {
      try {
        if (!updatingCourse.value.courseName || updatingCourse.value.courseName.trim() === '') {
          alert('课程名称不能为空');
          return;
        }

        if (!updatingCourse.value.courseDescription || updatingCourse.value.courseDescription.trim() === '') {
          alert('课程简介不能为空');
          return;
        }

        if (!updatingCourse.value.courseAuthor || updatingCourse.value.courseAuthor.trim() === '') {
          alert('课程作者不能为空');
          return;
        }

        if (updatingCourse.value.courseSort === undefined || updatingCourse.value.courseSort === null) {
          alert('课程排序不能为空');
          return;
        }

        let coverUrl = updatingCourse.value.coverUrl;

        // 如果有新的封面文件，先上传
        if (updateCoverFile.value) {
          const formData = new FormData();
          formData.append('file', updateCoverFile.value);

          const uploadResponse = await axios.post('/course/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });

          if (uploadResponse.data && uploadResponse.data.code === 200) {
            coverUrl = uploadResponse.data.data;
          } else {
            throw new Error('封面上传失败');
          }
        } else{
          coverUrl=null
        }

        // 更新课程信息
        const updateData = {
          ...updatingCourse.value,
          coverUrl: coverUrl
        };

        const response = await axios.post('/course/update-course', updateData);

        if (response.data && response.data.code === 200) {
          alert('课程修改成功！');
          showUpdateConfirm.value = false;
          await fetchCourses();
        } else {
          throw new Error(response.data?.message || '修改失败');
        }
      } catch (err) {
        console.error('修改课程失败:', err);
        alert('修改课程失败: ' + err.message);
      }
    };

    const closeEditModal = () => {
      editingCourse.value = null;
      coverPreview.value = null;
      uploadingCover.value = false;
    };

    // 删除相关方法
    const showDeleteModal = () => {
      if (selectedCourses.value.length === 0) {
        alert('请至少选择一门课程');
        return;
      }
      showDeleteConfirm.value = true;
    };

    const confirmDelete = async () => {
      try {
        for (const courseId of selectedCourses.value) {
          const response = await axios.get(`/course/delete-course?courseId=${courseId}`);
          if (!response.data || response.data.code !== 200) {
            throw new Error(`删除课程${courseId}失败`);
          }
        }

        alert('删除成功！');
        await fetchCourses();
        selectedCourses.value = [];
      } catch (err) {
        console.error('删除课程失败:', err);
        alert('删除课程失败: ' + err.message);
      } finally {
        showDeleteConfirm.value = false;
      }
    };

    // 文件上传方法
    const handleCoverUpload = async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      if (!editingCourse.value.courseName) {
        alert('请先输入课程名称');
        return;
      }

      if (!file.type.startsWith('image/')) {
        alert('请上传图片文件');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        coverPreview.value = e.target.result;
      };
      reader.readAsDataURL(file);

      uploadingCover.value = true;

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await axios.post('/course/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (response.data && response.data.code === 200) {
          editingCourse.value.coverUrl = response.data.data;
          alert('封面图片上传成功!');
        } else {
          throw new Error(response.data?.message || '上传失败');
        }
      } catch (error) {
        console.error('封面图片上传失败:', error);
        alert('封面图片上传失败: ' + error.message);
      } finally {
        uploadingCover.value = false;
        event.target.value = null;
      }
    };

    // 课程操作方法
    const addCourse = () => {
      coverPreview.value = null;
      uploadingCover.value = false;

      editingCourse.value = {
        courseName: "",
        courseDescription: "",
        courseAuthor: "",
        courseSort: 0,
        coverUrl: ""
      };
    };

    // 导出相关方法
    const showExportConfirmDialog = () => {
      if (displayedCourses.value.length === 0) {
        alert('没有可导出的课程数据');
        return;
      }
      showExportConfirm.value = true;
    };

    const confirmExport = async () => {
      showExportConfirm.value = false;
      await exportData();
    };

    // 导出数据方法
    const exportData = async () => {
      try {
        loading.value = true;

        const response = await axios.get('/course/get-all-course');
        const allCourses = response.data.data || [];

        const excelData = allCourses.map((course, index) => ({
          '序号': index + 1,
          '课程名称': course.courseName,
          '作者': course.courseAuthor || '未知',
          '课程简介': course.courseDescription || '',
          '排序': course.courseSort,
          '审核状态': getAuditStatusText(course.state),
          '创建时间': formatDateTime(course.courseCreateTime),
          '修改时间': formatDateTime(course.courseUpdateTime),
          '封面图片地址': course.coverUrl || '无封面图片'
        }));

        const worksheet = XLSX.utils.json_to_sheet(excelData);

        const colWidths = [
          { wch: 8 },   // 序号
          { wch: 30 },  // 课程名称
          { wch: 15 },  // 作者
          { wch: 40 },  // 课程简介
          { wch: 8 },   // 排序
          { wch: 12 },  // 审核状态
          { wch: 20 },  // 创建时间
          { wch: 20 },  // 修改时间
          { wch: 80 }   // 封面图片地址
        ];
        worksheet['!cols'] = colWidths;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, '课程列表');

        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        saveAs(blob, `课程列表_${new Date().toISOString().slice(0, 10)}.xlsx`);

      } catch (error) {
        console.error('导出失败:', error);
        alert('导出失败: ' + error.message);
      } finally {
        loading.value = false;
      }
    };

    // 日期格式化函数
    const formatDateTime = (dateTime) => {
      if (!dateTime) return '';

      try {
        let date;

        if (Array.isArray(dateTime)) {
          const year = dateTime[0];
          const month = dateTime[1] - 1;
          const day = dateTime[2] || 1;
          const hours = dateTime[3] || 0;
          const minutes = dateTime[4] || 0;
          const seconds = dateTime[5] || 0;

          date = new Date(year, month, day, hours, minutes, seconds);
        } else if (typeof dateTime === 'number') {
          date = new Date(dateTime);
        } else if (dateTime instanceof Date) {
          date = dateTime;
        } else if (typeof dateTime === 'string' && dateTime.includes('T')) {
          date = new Date(dateTime);
        } else if (typeof dateTime === 'string') {
          const sanitized = dateTime.replace(' ', 'T').replace(/[a-zA-Z]+$/, '');
          date = new Date(sanitized);

          if (isNaN(date.getTime())) {
            const parts = dateTime.split(/[- :]/);
            if (parts.length >= 3) {
              const year = parseInt(parts[0]);
              const month = parseInt(parts[1]) - 1;
              const day = parseInt(parts[2]);
              date = new Date(year, month, day);
            }
          }
        } else {
          return '';
        }

        if (isNaN(date.getTime())) return '';

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

      } catch (e) {
        console.error('日期格式化错误:', e);
        return '';
      }
    };

    const saveCourse = async () => {
      try {
        if (!editingCourse.value.courseName || editingCourse.value.courseName.trim() === '') {
          alert('课程名称不能为空');
          return;
        }

        if (!editingCourse.value.courseDescription || editingCourse.value.courseDescription.trim() === '') {
          alert('课程简介不能为空');
          return;
        }

        if (!editingCourse.value.courseAuthor || editingCourse.value.courseAuthor.trim() === '') {
          alert('课程作者不能为空');
          return;
        }

        if (editingCourse.value.courseSort === undefined || editingCourse.value.courseSort === null) {
          alert('课程排序不能为空');
          return;
        }

        if (!editingCourse.value.coverUrl || editingCourse.value.coverUrl.trim() === '') {
          alert('请上传课程封面');
          return;
        }

        const courseToSave = {
          courseName: editingCourse.value.courseName,
          courseDescription: editingCourse.value.courseDescription,
          courseAuthor: editingCourse.value.courseAuthor,
          courseSort: editingCourse.value.courseSort || 0,
          coverUrl: editingCourse.value.coverUrl || ""
        };

        const response = await axios.post('/course/add-course', courseToSave);

        if (response.data && response.data.code === 200) {
          alert('课程保存成功!');
          closeEditModal();
          await fetchCourses();
        } else {
          throw new Error(response.data?.message || '保存失败');
        }
      } catch (err) {
        console.error('保存课程失败:', err);
        alert('保存课程时出错: ' + err.message);
      }
    };

    // 添加 goToHome 方法
    const goToHome = () => {
      router.push({ name: 'RoleSelect' });
    };

    // 生命周期钩子
    onMounted(() => {
      fetchCourses();
    });

    return {
      goToHome,
      courses,
      loading,
      error,
      searchQuery,
      authorQuery,
      sortQuery,
      itemsPerPage,
      currentPage,
      totalPages,
      visiblePages,
      goToPage,
      editingCourse,
      paginatedCourses,
      displayedCourses,
      uploadingCover,
      coverPreview,
      selectedCourses,
      showDeleteConfirm,
      showUpdateConfirm,
      updatingCourse,
      updateCoverPreview,
      fetchCourses,
      resetSearch,
      goToSpecificPage,
      addCourse,
      closeEditModal,
      saveCourse,
      handleSearch,
      handleCoverUpload,
      showDeleteModal,
      confirmDelete,
      goToCourseDetail,
      showUpdateModal,
      handleUpdateCover,
      confirmUpdate,
      coverInput,
      updateCoverFile,
      showExportConfirm,
      showExportConfirmDialog,
      confirmExport,
      exportData,
      getAuditStatusText
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

body {
  background: #fff;
  color: #333;
}

.course-container {
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
  padding: 10px 24px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: #fff;
  font-size: 15px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

.add-btn {
  background: linear-gradient(to bottom, #28a745, #218838);
}

.add-btn:hover {
  background: linear-gradient(to bottom, #218838, #1c7430);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(40,167,69,0.3);
}

.edit-btn {
  background: linear-gradient(to bottom, #17a2b8, #138496);
}

.edit-btn:hover {
  background: linear-gradient(to bottom, #138496, #117a8b);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(23,162,184,0.3);
}

.del-btn {
  background: linear-gradient(to bottom, #dc3545, #c82333);
}

.del-btn:hover {
  background: linear-gradient(to bottom, #c82333, #bd2130);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(220,53,69,0.3);
}

.export-btn {
  background: linear-gradient(to bottom, #6f42c1, #5a32a3);
}

.export-btn:hover {
  background: linear-gradient(to bottom, #5a32a3, #4c2d8c);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(111,66,193,0.3);
}

.view-btn {
  background: linear-gradient(to bottom, #6c757d, #5a6268);
  padding: 6px 12px;
  font-size: 13px;
}

.view-btn:hover {
  background: linear-gradient(to bottom, #5a6268, #495057);
  transform: translateY(-2px);
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

.course-row {
  cursor: pointer;
  transition: all 0.3s;
}

.course-table tbody tr.course-row:hover {
  background-color: #f0f7ff;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.05);
}

.course-title {
  font-weight: 600;
  color: #007bff;
}

.course-title:hover {
  text-decoration: underline;
}

.course-description {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 审核状态样式 */
.audit-status-0 {
  color: #e6a23c;
  font-weight: bold;
}

.audit-status-1 {
  color: #67c23a;
  font-weight: bold;
}

.audit-status-2 {
  color: #f56c6c;
  font-weight: bold;
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
  flex-wrap: wrap;
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

.edit-modal, .update-modal, .delete-modal, .export-modal {
  background: #fff;
  border-radius: 12px;
  width: 90%;
  max-width: 750px;
  padding: 30px 35px;
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

.edit-modal h2, .update-modal h3, .delete-modal h3, .export-modal h3 {
  font-size: 24px;
  color: #2c3e50;
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eaeaea;
  text-align: center;
}

/* 表单样式 */
.form-group {
  margin-bottom: 22px;
  position: relative;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  font-size: 15px;
  color: #34495e;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 12px 15px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  font-size: 15px;
  transition: all 0.3s;
  background: #f8fafc;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);
}

.form-group input:focus,
.form-group textarea:focus {
  border-color: #3498db;
  outline: none;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.2);
  background: #fff;
}

.form-group textarea {
  min-height: 100px;
  resize: vertical;
}

.form-row {
  display: flex;
  gap: 20px;
}

.form-row .form-group {
  flex: 1;
}

.form-container {
  max-height: 60vh;
  overflow-y: auto;
  padding: 10px;
}

.cover-preview {
  margin-top: 10px;
  max-width: 100%;
  max-height: 180px;
  border-radius: 6px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.cover-preview img {
  max-width: 100%;
  max-height: 180px;
  border-radius: 6px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.preview-container {
  margin-top: 15px;
  max-width: 80%;
  text-align: center;
}

.upload-status {
  color: #3498db;
  margin-top: 10px;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.uploaded-url {
  color: #27ae60;
  margin-top: 10px;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  background: #e8f5e9;
  border-radius: 6px;
}

/* 按钮样式 */
.form-actions, .modal-actions {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 20px;
}

.cancel-button, .save-button, .update-button, .delete-button, .export-button {
  padding: 12px 28px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 120px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.cancel-button {
  background: #f5f7fa;
  color: #606266;
  border: 1px solid #dcdfe6;
}

.cancel-button:hover {
  background: #e6e9ed;
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0,0,0,0.15);
}

.save-button, .update-button {
  background: linear-gradient(135deg, #3498db, #1a5d9f);
  color: white;
  border: none;
}

.save-button:hover, .update-button:hover {
  background: linear-gradient(135deg, #2980b9, #15497c);
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(52, 152, 219, 0.3);
}

.delete-button {
  background: linear-gradient(135deg, #e74c3c, #c0392b);
  color: white;
  border: none;
}

.delete-button:hover {
  background: linear-gradient(135deg, #c0392b, #a53124);
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(231, 76, 60, 0.3);
}

.export-button {
  background: linear-gradient(135deg, #28a745, #218838);
  color: white;
  border: none;
}

.export-button:hover {
  background: linear-gradient(135deg, #218838, #1e7e34);
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(40, 167, 69, 0.3);
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
  color: #28a745;
  background: rgba(40, 167, 69, 0.1);
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 8px rgba(40,167,69,0.2);
}

.count-highlight {
  color: #007bff;
  font-weight: 600;
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
  color: #007bff;
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

  .action-bar {
    flex-wrap: wrap;
    gap: 8px;
  }

  .action-btn {
    flex: 1;
    min-width: 80px;
    padding: 8px 12px;
    font-size: 14px;
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

  .edit-modal, .update-modal {
    padding: 20px;
    width: 95%;
  }

  .form-row {
    flex-direction: column;
    gap: 15px;
  }

  .pagination-section {
    flex-wrap: wrap;
    justify-content: center;
  }

  .cancel-button, .save-button, .update-button, .delete-button, .export-button {
    padding: 10px 20px;
    min-width: 100px;
    font-size: 14px;
  }
}
</style>