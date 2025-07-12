<template>
  <div class="tabs-container">
    <!-- 标签页头部 -->
    <div class="tabs-header">
      <el-tabs
          v-model="activeTabName"
          type="card"
          editable
          class="main-tabs"
          @edit="handleTabsEdit"
          @tab-click="handleTabClick"
          @contextmenu.prevent="handleTabContextMenu"
      >
        <!-- 首页标签页 - 不可关闭 -->
        <el-tab-pane
            key="home"
            label="首页"
            name="home"
            :closable="false"
        >
          <template #label>
            <div class="tab-label home-tab">
              <el-icon><House /></el-icon>
              <span>首页</span>
            </div>
          </template>
        </el-tab-pane>

        <!-- 动态标签页 -->
        <el-tab-pane
            v-for="tab in dynamicTabs"
            :key="tab.name"
            :label="tab.title"
            :name="tab.name"
            :closable="tab.closable"
        >
          <template #label>
            <div
                class="tab-label"
                :class="{ 'tab-modified': tab.modified }"
                @contextmenu.prevent="(e) => handleTabContextMenu(e, tab)"
            >
              <el-icon v-if="tab.icon">
                <component :is="tab.icon" />
              </el-icon>
              <span>{{ tab.title }}</span>
              <el-icon v-if="tab.modified" class="modified-indicator">
                <CircleFilled />
              </el-icon>
            </div>
          </template>
        </el-tab-pane>
      </el-tabs>

      <!-- 标签页操作按钮 -->
      <div class="tabs-actions">
        <el-dropdown @command="handleTabAction" trigger="click">
          <el-button size="small" text>
            <el-icon><MoreFilled /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="closeOthers">关闭其他</el-dropdown-item>
              <el-dropdown-item command="closeAll">关闭所有</el-dropdown-item>
              <el-dropdown-item command="closeLeft">关闭左侧</el-dropdown-item>
              <el-dropdown-item command="closeRight">关闭右侧</el-dropdown-item>
              <el-dropdown-item divided command="refresh">刷新当前</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- 标签页内容区域 -->
    <div class="tabs-content">
      <!-- 首页内容 -->
      <div v-show="activeTabName === 'home'" class="tab-content">
        <home-admin @card-click="handleCardClick" />
      </div>

      <!-- 动态标签页内容 -->
      <div
          v-for="tab in dynamicTabs"
          :key="tab.name"
          v-show="activeTabName === tab.name"
          class="tab-content"
      >
        <component
            :is="tab.component"
            v-if="tab.component && (tab.loaded || activeTabName === tab.name)"
            @tab-modified="(modified) => handleTabModified(tab, modified)"
        />
        <div v-else-if="!tab.component" class="tab-placeholder">
          <el-empty description="页面加载中..." />
        </div>
      </div>
    </div>

    <!-- 右键菜单 -->
    <el-dropdown
        ref="contextMenuRef"
        :virtual-triggering="true"
        trigger="contextmenu"
        @command="handleContextMenuCommand"
    >
      <div></div>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="refresh">刷新</el-dropdown-item>
          <el-dropdown-item command="close" :disabled="!contextTab?.closable">关闭</el-dropdown-item>
          <el-dropdown-item command="closeOthers">关闭其他</el-dropdown-item>
          <el-dropdown-item command="closeAll">关闭所有</el-dropdown-item>
          <el-dropdown-item divided command="copyPath">复制路径</el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted, defineAsyncComponent, nextTick, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import type { TabPaneName } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  House,
  User,
  OfficeBuilding,
  VideoCamera,
  UserFilled,
  CirclePlusFilled,
  MoreFilled
} from '@element-plus/icons-vue'

// 导入首页组件
import HomeAdmin from '../views/home_admin.vue'
import CourseDetail from '@/views/CourseDetail.vue';

// 异步导入其他组件
const UserControl = defineAsyncComponent(() => import('../views/user_control.vue'))
const DepartmentManagement = defineAsyncComponent(() => import('../views/DepartmentManagement.vue'))
const NewManagement = defineAsyncComponent(() => import('../views/NewList.vue'))
const Conference = defineAsyncComponent(() => import('../views/Conference.vue'))
const Tenant = defineAsyncComponent(() => import('../views/tenant.vue'))
const Course= defineAsyncComponent(() => import('../views/CourseList.vue'))
const CourseExamine= defineAsyncComponent(() => import('../views/AuditList.vue'))

const router = useRouter()
const route = useRoute()

// 当前激活的标签页
const activeTabName = ref('home')

// 右键菜单相关
const contextMenuRef = ref()
const contextTab = ref<TabConfig | null>(null)

// 标签页配置接口
interface TabConfig {
  name: string
  title: string
  component?: any
  route: string
  closable: boolean
  icon?: any
  modified?: boolean
  loaded?: boolean
}

// 标签页配置映射
const tabConfigMap = {
  1: {
    name: 'user-control',
    title: '用户管理',
    component: UserControl,
    route: '/system/detail/1',
    closable: true,
    icon: User
  },
  2: {
    name: 'department-management',
    title: '组织管理',
    component: DepartmentManagement,
    route: '/system/detail/2',
    closable: true,
    icon: OfficeBuilding
  },
  3: {
    name: 'new',
    title: '新闻管理',
    component: NewManagement,
    route: '/system/detail/3',
    closable: true,
    icon: OfficeBuilding
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
    name: 'conference',
    title: '会议管理',
    component: Conference,
    route: '/system/detail/5',
    closable: true,
    icon: VideoCamera
  },
  6: {
    name: 'tenant',
    title: '租户管理',
    component: Tenant,
    route: '/system/detail/6',
    closable: true,
    icon: UserFilled
  },
  7: {
    name: 'course_examine',
    title: '课程审核',
    component: CourseExamine,
    route: '/system/detail/7',
    closable: true,
    icon: UserFilled
  },
  courseDetail: {
    name: 'course-detail',
    title: '课程详情',
    component: CourseDetail,
    route: '/course/:id',
    closable: true,
    icon: null
  }
}

const addCourseDetailTab = (courseId) => {
  const tabName = `course-detail-${courseId}`;

  // 检查标签页是否已存在
  if (!dynamicTabs.value.find(tab => tab.name === tabName)) {
    dynamicTabs.value.push({
      name: tabName,
      title: `课程详情-${courseId}`,
      component: CourseDetail,
      route: `/course/${courseId}`,
      closable: true,
      modified: false,
      loaded: false
    });
  }

  activeTabName.value = tabName;
}

// 动态标签页数组
const dynamicTabs = ref<TabConfig[]>([])

// 标签页计数器
let tabIndex = 0

// 保存标签页状态到本地存储
const saveTabsState = () => {
  const tabsState = {
    activeTab: activeTabName.value,
    tabs: dynamicTabs.value.map(tab => ({
      name: tab.name,
      title: tab.title,
      route: tab.route,
      closable: tab.closable,
      modified: tab.modified || false
    }))
  }
  localStorage.setItem('tabsState', JSON.stringify(tabsState))
}

// 从本地存储恢复标签页状态
const restoreTabsState = () => {
  try {
    const savedState = localStorage.getItem('tabsState')
    if (savedState) {
      const tabsState = JSON.parse(savedState)

      // 恢复动态标签页
      tabsState.tabs.forEach((savedTab: any) => {
        // 查找对应的配置
        const configEntry = Object.entries(tabConfigMap).find(
            ([_, config]) => config.name === savedTab.name
        )

        if (configEntry) {
          const [cardId, config] = configEntry
          const restoredTab: TabConfig = {
            ...config,
            modified: savedTab.modified || false,
            loaded: false
          }

          if (!dynamicTabs.value.find(tab => tab.name === restoredTab.name)) {
            dynamicTabs.value.push(restoredTab)
          }
        }
      })

      // 恢复激活的标签页
      if (tabsState.activeTab &&
          (tabsState.activeTab === 'home' ||
              dynamicTabs.value.find(tab => tab.name === tabsState.activeTab))) {
        activeTabName.value = tabsState.activeTab
      }
    }
  } catch (error) {
    console.warn('恢复标签页状态失败:', error)
  }
}

// 监听标签页变化，自动保存状态
watch([activeTabName, dynamicTabs], saveTabsState, { deep: true })

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
    const newTab: TabConfig = {
      ...tabConfig,
      modified: false,
      loaded: false
    }

    dynamicTabs.value.push(newTab)
    activeTabName.value = newTab.name
  }

  // 更新路由
  if (route.path !== tabConfig.route) {
    router.push(tabConfig.route)
  }
}

// 处理标签页修改状态
const handleTabModified = (tab: TabConfig, modified: boolean) => {
  tab.modified = modified
}

// 处理标签页编辑（添加/删除）
const handleTabsEdit = (
    targetName: TabPaneName | undefined,
    action: 'remove' | 'add'
) => {
  if (action === 'add') {
    // 添加新标签页（可以根据需要实现）
    const newTabName = `new-tab-${++tabIndex}`
    const newTab: TabConfig = {
      name: newTabName,
      title: `新标签 ${tabIndex}`,
      component: undefined,
      route: '',
      closable: true,
      modified: false,
      loaded: false
    }

    dynamicTabs.value.push(newTab)
    activeTabName.value = newTabName

  } else if (action === 'remove' && targetName) {
    closeTab(targetName as string)
  }
}

// 关闭标签页
const closeTab = async (tabName: string) => {
  const tab = dynamicTabs.value.find(t => t.name === tabName)

  // 如果标签页有未保存的修改，询问用户
  if (tab?.modified) {
    try {
      await ElMessageBox.confirm(
          `标签页 "${tab.title}" 有未保存的修改，确定要关闭吗？`,
          '确认关闭',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
      )
    } catch {
      return // 用户取消关闭
    }
  }

  const tabs = dynamicTabs.value
  let activeName = activeTabName.value

  // 如果删除的是当前激活的标签页，需要切换到其他标签页
  if (activeName === tabName) {
    const currentIndex = tabs.findIndex(tab => tab.name === tabName)
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
  dynamicTabs.value = tabs.filter(tab => tab.name !== tabName)

  // 如果切换到首页，更新路由
  if (activeName === 'home') {
    router.push('/admin/home')
  }
}

// 处理标签页点击事件
const handleTabClick = (tab: any) => {
  const tabName = tab.props.name

  if (tabName === 'home') {
    // 切换到首页
    router.push('/admin/home')
  } else {
    // 查找对应的标签页配置
    const currentTab = dynamicTabs.value.find(t => t.name === tabName)
    if (currentTab && currentTab.route) {
      router.push(currentTab.route)
      // 标记为已加载
      currentTab.loaded = true
    }
  }
}

// 处理右键菜单
const handleTabContextMenu = (event: MouseEvent, tab?: TabConfig) => {
  event.preventDefault()
  contextTab.value = tab || null

  nextTick(() => {
    contextMenuRef.value?.handleOpen(event)
  })
}

// 处理右键菜单命令
const handleContextMenuCommand = (command: string) => {
  switch (command) {
    case 'refresh':
      handleRefreshTab(contextTab.value?.name || activeTabName.value)
      break
    case 'close':
      if (contextTab.value?.closable) {
        closeTab(contextTab.value.name)
      }
      break
    case 'closeOthers':
      handleTabAction('closeOthers')
      break
    case 'closeAll':
      handleTabAction('closeAll')
      break
    case 'copyPath':
      handleCopyPath(contextTab.value)
      break
  }
}

// 处理标签页操作
const handleTabAction = async (command: string) => {
  switch (command) {
    case 'closeOthers':
      // 关闭除当前标签页外的所有标签页
      const currentTab = dynamicTabs.value.find(tab => tab.name === activeTabName.value)
      if (currentTab) {
        dynamicTabs.value = [currentTab]
      } else {
        dynamicTabs.value = []
      }
      break

    case 'closeAll':
      // 关闭所有动态标签页
      dynamicTabs.value = []
      activeTabName.value = 'home'
      router.push('/admin/home')
      break

    case 'closeLeft':
      // 关闭当前标签页左侧的所有标签页
      const currentIndex = dynamicTabs.value.findIndex(tab => tab.name === activeTabName.value)
      if (currentIndex > 0) {
        dynamicTabs.value = dynamicTabs.value.slice(currentIndex)
      }
      break

    case 'closeRight':
      // 关闭当前标签页右侧的所有标签页
      const currentIdx = dynamicTabs.value.findIndex(tab => tab.name === activeTabName.value)
      if (currentIdx !== -1) {
        dynamicTabs.value = dynamicTabs.value.slice(0, currentIdx + 1)
      }
      break

    case 'refresh':
      handleRefreshTab(activeTabName.value)
      break
  }
}

// 刷新标签页
const handleRefreshTab = (tabName: string) => {
  if (tabName === 'home') {
    // 刷新首页
    window.location.reload()
  } else {
    // 刷新动态标签页
    const tab = dynamicTabs.value.find(t => t.name === tabName)
    if (tab) {
      tab.loaded = false
      tab.modified = false
      nextTick(() => {
        tab.loaded = true
      })
    }
  }
}

// 复制路径
const handleCopyPath = (tab: TabConfig | null) => {
  if (tab) {
    navigator.clipboard.writeText(tab.route).then(() => {
      ElMessage.success('路径已复制到剪贴板')
    }).catch(() => {
      ElMessage.error('复制失败')
    })
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
  if (currentPath === '/admin/home' || currentPath === '/') {
    activeTabName.value = 'home'
  }
}

// 监听路由变化
router.afterEach((to) => {
  // 根据路由更新激活的标签页
  if (to.path === '/admin/home' || to.path === '/') {
    activeTabName.value = 'home'
  } else {
    // 查找对应的标签页
    for (const tab of dynamicTabs.value) {
      if (tab.route === to.path) {
        activeTabName.value = tab.name
        tab.loaded = true
        break
      }
    }
  }
})

// 组件挂载时初始化
onMounted(() => {
  restoreTabsState()
  initTabsFromRoute()
})
</script>

<style scoped>
.tabs-container {
  height: 100vh;
  background-color: #f5f7fa;
  display: flex;
  flex-direction: column;
}

.tabs-header {
  display: flex;
  align-items: center;
  background: white;
  border-bottom: 1px solid #e4e7ed;
  padding-right: 10px;
}

.main-tabs {
  flex: 1;
}

.main-tabs :deep(.el-tabs__header) {
  margin: 0;
  background: transparent;
  border: none;
}

.main-tabs :deep(.el-tabs__nav) {
  border: none;
}

.main-tabs :deep(.el-tabs__item) {
  border: none;
  border-radius: 0;
  padding: 0;
  height: 40px;
  line-height: 40px;
  margin-right: 2px;
  background: transparent;
  color: #606266;
  transition: all 0.3s;
  position: relative;
}

.main-tabs :deep(.el-tabs__item:hover) {
  background: #f5f7fa;
  color: #409eff;
}

.main-tabs :deep(.el-tabs__item.is-active) {
  background: #409eff;
  color: white;
  border-radius: 4px 4px 0 0;
}

.main-tabs :deep(.el-tabs__new-tab) {
  width: 32px;
  height: 32px;
  line-height: 32px;
  margin: 4px 0 0 8px;
  border-radius: 4px;
  background: #f5f7fa;
  color: #606266;
  transition: all 0.3s;
}

.main-tabs :deep(.el-tabs__new-tab:hover) {
  background: #409eff;
  color: white;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  position: relative;
}

.tab-label.home-tab {
  font-weight: bold;
}

.tab-label.tab-modified {
  padding-right: 20px;
}

.modified-indicator {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 8px;
  color: #f56c6c;
}

.tabs-actions {
  display: flex;
  align-items: center;
  padding-left: 10px;
  border-left: 1px solid #e4e7ed;
}

.tabs-content {
  flex: 1;
  overflow: hidden;
}

.tab-content {
  height: 100%;
  overflow: auto;
}

.tab-placeholder {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
}

/* 首页标签页特殊样式 */
.main-tabs :deep(.el-tabs__item[aria-controls="pane-home"]:not(.is-active)) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.main-tabs :deep(.el-tabs__item[aria-controls="pane-home"]:not(.is-active):hover) {
  background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .tab-label {
    padding: 0 8px;
    font-size: 14px;
  }

  .tab-label span {
    display: none;
  }

  .tabs-header {
    padding-right: 5px;
  }
}

/* 滚动条样式 */
.tab-content::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.tab-content::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.tab-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.tab-content::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>

