<template>
  <div class="home-container">
    <header class="header">
      <div class="header-left">
        <img src="@/assets/logo.svg" alt="测盟汇管理系统" class="logo">
        <h1 class="system-name">测盟汇管理系统</h1>
      </div>
      <div class="header-right">
        <el-dropdown>
          <span class="user-info">
            <el-avatar :size="40" :src="userAvatar" />
            <span class="username">{{ userName }}</span>
            <el-icon><arrow-down /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item>个人中心</el-dropdown-item>
              <el-dropdown-item>消息通知</el-dropdown-item>
              <el-dropdown-item divided @click="handleLogout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>

    <main class="content">
      <div class="welcome-section">
        <h2>欢迎回来，{{ userName }}！</h2>
        <p>今天是{{ currentDate }}，您有{{ notificationCount }}条未读通知</p>
      </div>

      <div class="dashboard">
        <!-- 快捷功能 -->
        <div class="quick-actions">
          <h3 class="section-title"><el-icon><Star /></el-icon> 快捷操作</h3>
          <div class="action-grid">
            <el-card
                v-for="action in quickActions"
                :key="action.id"
                shadow="hover"
                class="action-card"
                @click="handleAction(action.path)"
            >
              <div class="action-content">
                <el-icon :size="36" :color="action.color">
                  <component :is="action.icon" />
                </el-icon>
                <span>{{ action.name }}</span>
              </div>
            </el-card>
          </div>
        </div>

        <!-- 数据概览 -->
        <div class="data-overview">
          <h3 class="section-title"><el-icon><DataLine /></el-icon> 数据概览</h3>
          <div class="stats-grid">
            <el-card v-for="stat in statistics" :key="stat.id" shadow="never">
              <div class="stat-item">
                <div class="stat-icon" :style="{ backgroundColor: stat.bgColor }">
                  <el-icon :size="24"><component :is="stat.icon" /></el-icon>
                </div>
                <div class="stat-info">
                  <div class="stat-value">{{ stat.value }}</div>
                  <div class="stat-label">{{ stat.label }}</div>
                </div>
              </div>
            </el-card>
          </div>
        </div>

        <!-- 最近活动 -->
        <div class="recent-activities">
          <h3 class="section-title"><el-icon><Clock /></el-icon> 最近活动</h3>
          <el-timeline>
            <el-timeline-item
                v-for="(activity, index) in activities"
                :key="index"
                :timestamp="activity.time"
                :type="activity.type"
                :color="activity.color"
                placement="top"
            >
              <el-card>
                <p>{{ activity.content }}</p>
              </el-card>
            </el-timeline-item>
          </el-timeline>
        </div>
      </div>
    </main>

    <footer class="footer">
      <p>&copy; 2023 测盟汇管理团队. 版权所有. v{{ version }}</p>
    </footer>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import {
  ArrowDown, Star, DataLine, Clock,
  User, Document, Setting, Tickets,
  Collection, ChatDotRound, Monitor, Present
} from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

export default {
  name: 'HomeView',
  components: {
    ArrowDown, Star, DataLine, Clock
  },
  setup() {
    const router = useRouter()

    // 用户信息
    const userName = ref('管理员')
    const userAvatar = ref('https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png')
    const notificationCount = ref(3)
    const version = ref('1.0.0')

    // 当前日期
    const currentDate = computed(() => {
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth() + 1
      const day = now.getDate()
      const week = ['日', '一', '二', '三', '四', '五', '六'][now.getDay()]
      return `${year}年${month}月${day}日 星期${week}`
    })

    // 快捷操作
    const quickActions = ref([
      { id: 1, name: '用户管理', icon: User, path: '/user', color: '#409EFF' },
      { id: 2, name: '项目管理', icon: Document, path: '/project', color: '#67C23A' },
      { id: 3, name: '系统设置', icon: Setting, path: '/settings', color: '#E6A23C' },
      { id: 4, name: '报告管理', icon: Tickets, path: '/report', color: '#F56C6C' },
      { id: 5, name: '数据统计', icon: Collection, path: '/stats', color: '#909399' },
      { id: 6, name: '消息中心', icon: ChatDotRound, path: '/message', color: '#9C27B0' }
    ])

    // 数据统计
    const statistics = ref([
      { id: 1, label: '总用户数', value: '1,248', icon: User, bgColor: '#409EFF20' },
      { id: 2, label: '进行中项目', value: '28', icon: Monitor, bgColor: '#67C23A20' },
      { id: 3, label: '待审核报告', value: '14', icon: Tickets, bgColor: '#F56C6C20' },
      { id: 4, label: '本周新增', value: '56', icon: Present, bgColor: '#E6A23C20' }
    ])

    // 最近活动
    const activities = ref([
      {
        time: '2023-11-15 14:30',
        content: '用户张三提交了项目A的测试报告',
        type: 'primary',
        color: '#409EFF'
      },
      {
        time: '2023-11-15 10:15',
        content: '系统进行了版本1.0.0的更新',
        type: 'success',
        color: '#67C23A'
      },
      {
        time: '2023-11-14 16:45',
        content: '管理员修改了系统配置参数',
        type: 'warning',
        color: '#E6A23C'
      },
      {
        time: '2023-11-14 09:20',
        content: '新用户李四注册了账号',
        type: '',
        color: '#909399'
      }
    ])

    // 操作方法
    const handleAction = (path) => {
      router.push(path)
    }

    const handleLogout = () => {
      ElMessageBox.confirm('确定要退出登录吗?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        // 这里添加退出登录逻辑
        ElMessage.success('退出成功')
        router.push('/login')
      }).catch(() => {})
    }

    return {
      userName,
      userAvatar,
      notificationCount,
      version,
      currentDate,
      quickActions,
      statistics,
      activities,
      handleAction,
      handleLogout
    }
  }
}
</script>

<style scoped>
.home-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-size: cover;
  color: white;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 30px;
  background-color: rgba(0, 0, 0, 0.5);
}

.header-left {
  display: flex;
  align-items: center;
}

.logo {
  width: 50px;
  height: 50px;
  margin-right: 15px;
}

.system-name {
  font-size: 22px;
  margin: 0;
  font-weight: 500;
}

.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.username {
  margin: 0 8px 0 12px;
  font-size: 16px;
}

.content {
  flex: 1;
  padding: 20px 30px;
  background-color: rgba(0, 0, 0, 0.3);
}

.welcome-section {
  margin-bottom: 30px;
}

.welcome-section h2 {
  font-size: 24px;
  margin-bottom: 8px;
}

.welcome-section p {
  font-size: 16px;
  color: #eee;
}

.section-title {
  display: flex;
  align-items: center;
  font-size: 18px;
  margin: 25px 0 15px;
}

.section-title .el-icon {
  margin-right: 8px;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 15px;
}

.action-card {
  background-color: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  transition: transform 0.3s;
  cursor: pointer;
}

.action-card:hover {
  transform: translateY(-5px);
}

.action-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 10px;
}

.action-content span {
  margin-top: 10px;
  font-size: 16px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 15px;
}

.stat-item {
  display: flex;
  align-items: center;
}

.stat-icon {
  width: 50px;
  height: 50px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #ddd;
}

.recent-activities {
  margin-top: 30px;
}

.el-timeline {
  padding-left: 10px;
}

.el-timeline-item__wrapper {
  padding-left: 20px;
}

.footer {
  padding: 12px;
  text-align: center;
  background-color: rgba(0, 0, 0, 0.5);
  font-size: 14px;
  color: #ccc;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .header {
    flex-direction: column;
    padding: 15px;
  }

  .header-left {
    margin-bottom: 10px;
  }

  .action-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>