<template>
  <div class="user-tabs-container">
    <el-tabs
        v-model="activeTabName"
        type="card"
        editable
        class="main-tabs"
        @edit="handleTabsEdit"
        @tab-click="handleTabClick"
    >
      <!-- 首页标签页 - 不可关闭 -->
      <el-tab-pane
          key="home"
          label="首页"
          name="home"
          :closable="false"
      >
        <user-home @card-click="handleCardClick" />
      </el-tab-pane>

      <!-- 动态标签页 -->
      <el-tab-pane
          v-for="tab in dynamicTabs"
          :key="tab.name"
          :label="tab.title"
          :name="tab.name"
          :closable="tab.closable"
      >
        <component :is="tab.component" v-if="tab.component" />
        <div v-else class="tab-placeholder">
          <el-empty description="页面加载中..." />
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted, defineAsyncComponent } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import type { TabPaneName } from 'element-plus'
import { ElMessage } from 'element-plus'

// 导入首页组件
import UserHome from '../views/UserHome.vue'
import {OfficeBuilding} from "@element-plus/icons-vue";

// 异步导入其他组件
const UserConference = defineAsyncComponent(() => import('../views/userConference.vue'))
const UserNew = defineAsyncComponent(() => import('../views/NewList.vue'))
const Course= defineAsyncComponent(() => import('../views/UserCourseList.vue'))

const router = useRouter()
const route = useRoute()

// 当前激活的标签页
const activeTabName = ref('home')

// 标签页配置映射
const tabConfigMap = {
  3: {
    name: 'userNew',
    title: '行业动态',
    component: UserNew,
    route: '/user/news',
    closable: true
  },
  4: {
    name: 'course',
    title: '课程管理',
    component: Course,
    route: '/system/detail/4',
    closable: true,
    icon: OfficeBuilding
  },
  5: {
    name: 'user-conference',
    title: '会议管理',
    component: UserConference,
    route: '/user/conference',
    closable: true
  }
}

// 动态标签页数组
const dynamicTabs = ref<Array<{
  name: string
  title: string
  component?: any
  route: string
  closable: boolean
}>>([])

// 标签页计数器
let tabIndex = 0

// 处理首页卡片点击事件
const handleCardClick = (cardId: number) => {
  console.log('Card clicked:', cardId)

  const tabConfig = tabConfigMap[cardId as keyof typeof tabConfigMap]
  if (!tabConfig) {
    ElMessage.warning('该功能暂未开放')
    return
  }

  // 检查标签页是否已存在
  const existingTab = dynamicTabs.value.find(tab => tab.name === tabConfig.name)

  if (existingTab) {
    // 如果标签页已存在，直接切换到该标签页
    activeTabName.value = existingTab.name
  } else {
    // 创建新的标签页
    const newTab = {
      name: tabConfig.name,
      title: tabConfig.title,
      component: tabConfig.component,
      route: tabConfig.route,
      closable: tabConfig.closable
    }

    dynamicTabs.value.push(newTab)
    activeTabName.value = newTab.name
  }

  // 更新路由
  if (route.path !== tabConfig.route) {
    router.push(tabConfig.route)
  }
}

// 处理标签页编辑（添加/删除）
const handleTabsEdit = (
    targetName: TabPaneName | undefined,
    action: 'remove' | 'add'
) => {
  if (action === 'add') {
    // 添加新标签页（可以根据需要实现）
    const newTabName = `new-tab-${++tabIndex}`
    const newTab = {
      name: newTabName,
      title: `新标签 ${tabIndex}`,
      component: undefined,
      route: '',
      closable: true
    }

    dynamicTabs.value.push(newTab)
    activeTabName.value = newTabName

  } else if (action === 'remove' && targetName) {
    // 删除标签页
    const tabs = dynamicTabs.value
    let activeName = activeTabName.value

    // 如果删除的是当前激活的标签页，需要切换到其他标签页
    if (activeName === targetName) {
      const currentIndex = tabs.findIndex(tab => tab.name === targetName)
      if (currentIndex !== -1) {
        // 优先切换到右边的标签页，如果没有则切换到左边的
        const nextTab = tabs[currentIndex + 1] || tabs[currentIndex - 1]
        if (nextTab) {
          activeName = nextTab.name
        } else {
          // 如果没有其他动态标签页，切换到首页
          activeName = 'home'
        }
      }
    }

    // 更新激活的标签页
    activeTabName.value = activeName

    // 从数组中移除标签页
    dynamicTabs.value = tabs.filter(tab => tab.name !== targetName)

    // 如果切换到首页，更新路由
    if (activeName === 'home') {
      router.push('/user/home')
    }
  }
}

// 处理标签页点击事件
const handleTabClick = (tab: any) => {
  const tabName = tab.props.name

  if (tabName === 'home') {
    // 切换到首页
    router.push('/user/home')
  } else {
    // 查找对应的标签页配置
    const currentTab = dynamicTabs.value.find(t => t.name === tabName)
    if (currentTab && currentTab.route) {
      router.push(currentTab.route)
    }
  }
}

// 根据当前路由初始化标签页
const initTabsFromRoute = () => {
  const currentPath = route.path

  // 检查是否是功能模块路由
  for (const [cardId, config] of Object.entries(tabConfigMap)) {
    if (config.route === currentPath) {
      handleCardClick(parseInt(cardId))
      return
    }
  }

  // 如果是首页路由，确保激活首页标签
  if (currentPath === '/user/home' || currentPath === '/user') {
    activeTabName.value = 'home'
  }
}

// 监听路由变化
router.afterEach((to) => {
  // 根据路由更新激活的标签页
  if (to.path === '/user/home' || to.path === '/user') {
    activeTabName.value = 'home'
  } else {
    // 查找对应的标签页
    for (const tab of dynamicTabs.value) {
      if (tab.route === to.path) {
        activeTabName.value = tab.name
        break
      }
    }
  }
})

// 组件挂载时初始化
onMounted(() => {
  initTabsFromRoute()
})
</script>

<style scoped>
.user-tabs-container {
  height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  position: relative;
  overflow: hidden;
}

.user-tabs-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
      radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.1) 0%, transparent 50%);
  pointer-events: none;
  z-index: 0;
}

.main-tabs {
  height: 100%;
  position: relative;
  z-index: 1;
}

/* 标签页头部容器 */
.main-tabs :deep(.el-tabs__header) {
  margin: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(228, 231, 237, 0.6);
  padding: 0 24px;
  box-shadow:
      0 4px 20px rgba(0, 0, 0, 0.08),
      0 1px 3px rgba(0, 0, 0, 0.1);
  position: relative;
}

.main-tabs :deep(.el-tabs__header)::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg,
  transparent 0%,
  rgba(102, 126, 234, 0.3) 50%,
  transparent 100%);
}

.main-tabs :deep(.el-tabs__nav) {
  border: none;
  position: relative;
}

/* 标签页项目基础样式 */
.main-tabs :deep(.el-tabs__item) {
  border: none;
  border-radius: 12px 12px 0 0;
  padding: 0 24px;
  height: 52px;
  line-height: 52px;
  margin-right: 4px;
  background: linear-gradient(145deg, #f8f9fa 0%, #e9ecef 100%);
  color: #606266;
  font-weight: 500;
  font-size: 14px;
  position: relative;
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  overflow: hidden;
  box-shadow:
      0 2px 8px rgba(0, 0, 0, 0.06),
      inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

/* 标签页项目伪元素装饰 */
.main-tabs :deep(.el-tabs__item)::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0) 0%, rgba(118, 75, 162, 0.1) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

/* 标签页悬停效果 */
.main-tabs :deep(.el-tabs__item:hover) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  transform: translateY(-2px);
  box-shadow:
      0 8px 25px rgba(102, 126, 234, 0.3),
      0 3px 10px rgba(0, 0, 0, 0.1);
}

.main-tabs :deep(.el-tabs__item:hover)::before {
  opacity: 1;
}

/* 激活状态的标签页 */
.main-tabs :deep(.el-tabs__item.is-active) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px 12px 0 0;
  transform: translateY(-1px);
  box-shadow:
      0 8px 32px rgba(102, 126, 234, 0.4),
      0 4px 16px rgba(0, 0, 0, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  position: relative;
  z-index: 10;
}

.main-tabs :deep(.el-tabs__item.is-active)::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  border-radius: 2px 2px 0 0;
}

/* 首页标签页特殊样式 */
.main-tabs :deep(.el-tabs__item[aria-controls="pane-home"]) {
  font-weight: 600;
  position: relative;
}

.main-tabs :deep(.el-tabs__item[aria-controls="pane-home"])::before {
  content: '🏠';
  margin-right: 6px;
  font-size: 16px;
}

.main-tabs :deep(.el-tabs__item[aria-controls="pane-home"]:not(.is-active)) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow:
      0 4px 16px rgba(102, 126, 234, 0.3),
      0 2px 8px rgba(0, 0, 0, 0.1);
}

.main-tabs :deep(.el-tabs__item[aria-controls="pane-home"]:not(.is-active):hover) {
  background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
  transform: translateY(-3px);
  box-shadow:
      0 12px 32px rgba(102, 126, 234, 0.4),
      0 4px 16px rgba(0, 0, 0, 0.15);
}

/* 新增标签页按钮 */
.main-tabs :deep(.el-tabs__new-tab) {
  width: 44px;
  height: 44px;
  line-height: 44px;
  margin: 4px 0 0 12px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  color: #606266;
  transition: all 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55);
  box-shadow:
      0 2px 8px rgba(0, 0, 0, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.8);
  position: relative;
  overflow: hidden;
}

.main-tabs :deep(.el-tabs__new-tab)::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: radial-gradient(circle, rgba(102, 126, 234, 0.3) 0%, transparent 70%);
  transition: all 0.3s ease;
  transform: translate(-50%, -50%);
  border-radius: 50%;
}

.main-tabs :deep(.el-tabs__new-tab:hover) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  transform: scale(1.1) rotate(90deg);
  box-shadow:
      0 8px 25px rgba(102, 126, 234, 0.4),
      0 3px 10px rgba(0, 0, 0, 0.1);
}

.main-tabs :deep(.el-tabs__new-tab:hover)::before {
  width: 100%;
  height: 100%;
}

/* 关闭按钮美化 */
.main-tabs :deep(.el-tabs__item .el-icon-close) {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.8);
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
}

.main-tabs :deep(.el-tabs__item .el-icon-close:hover) {
  background: #f56c6c;
  color: white;
  transform: scale(1.2);
  box-shadow: 0 2px 8px rgba(245, 108, 108, 0.4);
}

/* 内容区域 */
.main-tabs :deep(.el-tabs__content) {
  height: calc(100% - 53px);
  overflow: hidden;
  position: relative;
}

.main-tabs :deep(.el-tab-pane) {
  height: 100%;
  overflow: auto;
  animation: fadeInUp 0.5s ease-out;
}

/* 占位符样式 */
.tab-placeholder {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
}

.tab-placeholder :deep(.el-empty) {
  padding: 60px 0;
}

.tab-placeholder :deep(.el-empty__image) {
  width: 120px;
  height: 120px;
}

.tab-placeholder :deep(.el-empty__description) {
  color: #909399;
  font-size: 16px;
  margin-top: 16px;
}

/* 动画定义 */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes ripple {
  0% {
    transform: scale(0);
    opacity: 1;
  }
  100% {
    transform: scale(4);
    opacity: 0;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .main-tabs :deep(.el-tabs__item) {
    padding: 0 16px;
    font-size: 13px;
    height: 48px;
    line-height: 48px;
    margin-right: 2px;
  }

  .main-tabs :deep(.el-tabs__header) {
    padding: 0 16px;
  }

  .main-tabs :deep(.el-tabs__new-tab) {
    width: 40px;
    height: 40px;
    line-height: 40px;
    margin: 4px 0 0 8px;
  }

  .main-tabs :deep(.el-tabs__item[aria-controls="pane-home"])::before {
    font-size: 14px;
    margin-right: 4px;
  }
}

@media (max-width: 480px) {
  .main-tabs :deep(.el-tabs__item) {
    padding: 0 12px;
    font-size: 12px;
  }

  .main-tabs :deep(.el-tabs__header) {
    padding: 0 12px;
  }
}

/* 滚动条美化 */
.main-tabs :deep(.el-tab-pane)::-webkit-scrollbar {
  width: 6px;
}

.main-tabs :deep(.el-tab-pane)::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}

.main-tabs :deep(.el-tab-pane)::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 3px;
}

.main-tabs :deep(.el-tab-pane)::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
}
</style>

