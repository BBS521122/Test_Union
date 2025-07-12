<template>
  <div class="admin-layout">
    <!-- 顶部导航栏 -->
    <el-header class="header">
      <div class="header-left">
        <el-icon class="logo-icon">
          <Menu/>
        </el-icon>
        <span class="logo-text">测盟汇</span>
        <el-breadcrumb separator="/" class="breadcrumb">
          <el-breadcrumb-item>首页</el-breadcrumb-item>
        </el-breadcrumb>
      </div>
      <div class="header-right">
        <el-icon class="header-icon" @click="handleHeaderIconClick('search')">
          <Search/>
        </el-icon>
        <el-icon class="header-icon" @click="handleHeaderIconClick('message')">
          <Message/>
        </el-icon>
        <el-icon class="header-icon" @click="handleHeaderIconClick('fullscreen')">
          <FullScreen/>
        </el-icon>
        <el-dropdown>
          <span class="user-info">
            <el-avatar size="small" :src="avatar"/>
            <span class="username">{{name}}</span>
            <el-icon><ArrowDown/></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="router.push('/profile')">个人中心</el-dropdown-item>
              <el-dropdown-item divided @click="handleLogout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </el-header>

    <!-- 主要内容区域 -->
    <el-main class="main-content">
      <!-- 卡片轮播展示 -->
      <div class="carousel-container">
        <el-carousel
            :interval="5000"
            type="card"
            height="400px"
            ref="carouselRef"
            @change="handleCarouselChange"
        >
          <el-carousel-item
              v-for="course in courseList"
              :key="course.id"
              @click="handleCardClick(course.id)"
          >
            <div class="course-card">
              <div class="course-image">
                <img :src="course.image" :alt="course.title"/>
              </div>
              <div class="course-content">
                <h3 class="course-title">{{ course.title }}</h3>
              </div>
            </div>
          </el-carousel-item>
        </el-carousel>
      </div>

      <!-- 控制按钮和分页 -->
      <div class="bottom-controls">
        <div class="carousel-controls">
          <el-button @click="prevSlide" type="primary" circle>
            <el-icon>
              <ArrowLeft/>
            </el-icon>
          </el-button>
          <el-button @click="nextSlide" type="primary" circle>
            <el-icon>
              <ArrowRight/>
            </el-icon>
          </el-button>
        </div>

        <!-- 课程指示器 -->
        <div class="course-indicators">
          <div
              v-for="(course, index) in courseList"
              :key="course.id"
              class="indicator-dot"
              :class="{ active: currentSlide === index }"
              @click="goToSlide(index)"
          >
            <span class="indicator-text">{{ course.title.substring(0, 4) }}</span>
          </div>
        </div>
      </div>
    </el-main>
  </div>
</template>

<script setup lang="ts">
import {ref, onMounted} from 'vue'
import {useRouter} from "vue-router";
import axios from "axios";
import {ElMessage} from "element-plus";
import {
  ArrowLeft,
  ArrowRight,
  Menu,
  Search,
  Message,
  FullScreen,
  ArrowDown,
  User,
  Star,
  View
} from '@element-plus/icons-vue'

const router = useRouter()

let name = ref('')
axios.get('/user/get')
    .then(response => {
      if (response.data.code == 200 && response.data.data) {
        console.log(response.data)
        name.value = response.data.data.nickname
      }
    })

// 定义事件
const emit = defineEmits<{
  'card-click': [cardId: number]
}>()

// 防抖函数工具
const debounce = <T extends (...args: any[]) => any>(
    func: T,
    delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func.apply(null, args), delay)
  }
}

// 节流函数工具
const throttle = <T extends (...args: any[]) => any>(
    func: T,
    delay: number
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0
  return (...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastCall >= delay) {
      lastCall = now
      func.apply(null, args)
    }
  }
}

// 轮播相关
const carouselRef = ref()
const currentSlide = ref(0)
const isSliding = ref(false)

// 防抖优化的轮播控制
const prevSlide = debounce(() => {
  if (isSliding.value) return
  isSliding.value = true
  carouselRef.value?.prev()
  setTimeout(() => {
    isSliding.value = false
  }, 600) // 轮播动画时间
}, 300)

const nextSlide = debounce(() => {
  if (isSliding.value) return
  isSliding.value = true
  carouselRef.value?.next()
  setTimeout(() => {
    isSliding.value = false
  }, 600)
}, 300)

const goToSlide = debounce((index: number) => {
  if (isSliding.value || currentSlide.value === index) return
  isSliding.value = true
  carouselRef.value?.setActiveItem(index)
  setTimeout(() => {
    isSliding.value = false
  }, 600)
}, 200)

// 节流优化的轮播变化处理
const handleCarouselChange = throttle((current: number) => {
  currentSlide.value = current
}, 100)

// 防抖优化的点击卡片事件
const handleCardClick = debounce((courseId: number) => {
  emit('card-click', courseId)
  ElMessage.success(`点击了课程ID: ${courseId}`)
}, 500)

// 分页数据
const currentPage = ref(1)
const pageSize = ref(6)
const total = ref(48)

import userManagementImage from '@/assets/用户管理.jpg'
import DepartmentManagementImage from '@/assets/组织管理.jpg'
import conferenceImage from '@/assets/会议管理.jpg'
import tenantManagementImage from '@/assets/租户管理.jpg'
import newsManagementImage from '@/assets/行业动态.jpg'
import courseManagementImage from '@/assets/课程管理.jpg'

// 课程列表数据
const courseList = ref([
  {
    id: 1,
    title: '用户管理子系统',
    image: userManagementImage,
  },
  {
    id: 2,
    title: '组织管理子系统',
    image: DepartmentManagementImage,
  },
  {
    id: 3,
    title: '行业动态管理子系统',
    image: newsManagementImage,
  },
  {
    id: 4,
    title: '课程管理子系统',
    image: courseManagementImage,
  },
  {
    id: 5,
    title: '会议管理子系统',
    image: conferenceImage,
  },
  {
    id: 6,
    title: '租户管理子系统',
    image: tenantManagementImage,
  },
  {
    id: 7,
    title: '课程审核子系统',
    image: courseManagementImage,
  }
])

// 分页处理
const handleSizeChange = (val: number) => {
  pageSize.value = val
}

const handleCurrentChange = (val: number) => {
  currentPage.value = val
}

// 防抖优化的登出处理
const handleLogout = debounce(async () => {
  try {
    const token = localStorage.getItem('token')
    const response = await axios.post('/user/layout', null, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (response.status === 200) {
      localStorage.removeItem('token')
      await router.push('/login')
      ElMessage.success('登出成功')
    } else {
      ElMessage.error('登出失败')
    }
  } catch (err) {
    ElMessage.error('登出请求异常')
    console.error('登出异常:', err)
  }
}, 1000) // 登出操作防抖时间设置较长，避免误操作

// 防抖优化的搜索功能（如果需要的话）
const searchKeyword = ref('')
const handleSearch = debounce((keyword: string) => {
  if (!keyword.trim()) {
    ElMessage.warning('请输入搜索关键词')
    return
  }

  // 这里可以添加实际的搜索逻辑
  console.log('搜索关键词:', keyword)
  ElMessage.success(`搜索: ${keyword}`)
}, 800)

// 防抖优化的头部图标点击事件
const handleHeaderIconClick = debounce((iconType: string) => {
  switch (iconType) {
    case 'search':
      ElMessage.info('打开搜索功能')
      break
    case 'message':
      ElMessage.info('查看消息')
      break
    case 'fullscreen':
      // 切换全屏
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen()
        ElMessage.success('已进入全屏模式')
      } else {
        document.exitFullscreen()
        ElMessage.success('已退出全屏模式')
      }
      break
    default:
      break
  }
}, 300)

let avatar = ref("https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png")


axios.get('/user/get-avatar')
    .then(response => {
      if (response.data.code == 200 && response.data.data) {
        console.log(response.data.data)
        avatar.value = response.data.data
        console.log(avatar.value)
      } else {
        ElMessage.error('暂无头像，以默认头像代替')
        avatar.value = "https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png"
      }
    }).catch(error => {
  console.error('暂无头像:', error)
  ElMessage.error('暂无头像，以默认头像代替')
  avatar.value = "https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png"
})

</script>

<style scoped>
.admin-layout {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.header {
  background: white;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 60px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.logo-icon {
  font-size: 20px;
  color: #409eff;
}

.logo-text {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}

.breadcrumb {
  margin-left: 20px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon {
  font-size: 18px;
  color: #606266;
  cursor: pointer;
  transition: color 0.3s;
}

.header-icon:hover {
  color: #409eff;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.username {
  color: #303133;
  font-size: 14px;
}

.main-content {
  padding: 20px;
}

/* 轮播容器样式 */
.carousel-container {
  margin: 40px auto;
  max-width: 1200px;
}

/* 课程卡片样式 */
.course-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  height: 100%;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
}

.course-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.15);
}

.course-image {
  position: relative;
  height: 200px;
  overflow: hidden;
}

.course-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.course-card:hover .course-image img {
  transform: scale(1.1);
}

.course-tag {
  position: absolute;
  top: 12px;
  right: 12px;
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  backdrop-filter: blur(10px);
  z-index: 2;
}

.course-tag.tag-active {
  background: linear-gradient(45deg, #67c23a, #85ce61);
}

.course-tag.tag-finished {
  background: linear-gradient(45deg, #909399, #b3b7bd);
}

.course-content {
  padding: 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.course-title {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
  margin: 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.course-description {
  color: #606266;
  font-size: 14px;
  line-height: 1.6;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

.course-stats {
  display: flex;
  gap: 16px;
  margin: 12px 0;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #909399;
}

.course-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.course-duration {
  font-size: 13px;
  color: #606266;
  font-weight: 500;
}

/* 底部控制区域 */
.bottom-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  margin-top: 40px;
}

.carousel-controls {
  display: flex;
  gap: 16px;
}

/* 课程指示器 */
.course-indicators {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 600px;
}

.indicator-dot {
  padding: 6px 12px;
  border-radius: 20px;
  background: #f0f2f5;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 12px;
  color: #606266;
  border: 2px solid transparent;
}

.indicator-dot:hover {
  background: #e6f7ff;
  color: #409eff;
}

.indicator-dot.active {
  background: #409eff;
  color: white;
  border-color: #409eff;
  transform: scale(1.1);
}

.indicator-text {
  font-weight: 500;
}

.pagination-wrapper {
  width: 100%;
  display: flex;
  justify-content: center;
}

/* Element Plus 轮播样式覆盖 */
:deep(.el-carousel__item) {
  border-radius: 16px;
  overflow: hidden;
}

:deep(.el-carousel__item.is-active) {
  transform: scale(1);
}

:deep(.el-carousel__arrow) {
  background: rgba(255, 255, 255, 0.9);
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

:deep(.el-carousel__arrow:hover) {
  background: white;
}

:deep(.el-carousel__indicators--outside) {
  margin-top: 20px;
}

:deep(.el-carousel__indicator) {
  padding: 4px;
}

:deep(.el-carousel__button) {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  border: 2px solid #409eff;
}

:deep(.el-carousel__indicator.is-active .el-carousel__button) {
  background: #409eff;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .carousel-container {
    margin: 20px auto;
  }

  .course-indicators {
    max-width: 100%;
    gap: 4px;
  }

  .indicator-dot {
    padding: 4px 8px;
    font-size: 11px;
  }

  .course-content {
    padding: 16px;
  }

  .course-title {
    font-size: 16px;
  }

  .course-description {
    font-size: 13px;
  }
}
</style>