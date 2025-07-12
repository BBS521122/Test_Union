<template>
  <div>
    <!-- 顶部搜索区域 -->
    <el-row :gutter="10" class="mb-4">
      <el-col :span="6">
        <el-input
            v-model="searchForm.keyword"
            placeholder="请输入会议名称/关键词/创建人"
            clearable
            @keyup.enter="handleSearch"
        />
      </el-col>
      <el-col :span="6">
        <el-select
            v-model="searchForm.status"
            placeholder="会议状态"
            clearable
            filterable
        >
          <el-option label="全部" value=""/>
          <el-option label="审核中" value="UNDER_CHECK"/>
          <el-option label="已通过" value="APPROVED"/>
          <el-option label="已拒绝" value="REJECTED"/>
          <el-option label="进行中" value="ONGOING"/>
          <el-option label="已完成" value="COMPLETED"/>
        </el-select>
      </el-col>
      <el-col :span="6">
        <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            clearable
        />
      </el-col>
      <el-col :span="6">
        <el-button
            type="primary"
            @click="handleSearch"
            :loading="searchLoading"
        >
          搜索
        </el-button>
        <el-button @click="resetSearch">重置</el-button>
      </el-col>
    </el-row>

    <!-- 优化后的操作区域 -->
    <div class="operation-area">
      <!-- 新增按钮 -->
      <div class="action-buttons">
        <el-button type="primary" @click="openDialog()" size="default">
          <el-icon>
            <Plus/>
          </el-icon>
          新增会议
        </el-button>
      </div>
    </div>

    <!-- 表格 -->
    <el-table :data="conferenceList" border class="conference-table">
      <el-table-column prop="name" label="会议名称" min-width="150"/>
      <el-table-column prop="userName" label="创建人" width="120"/>
      <el-table-column prop="state" label="会议状态" width="120">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.state)" size="small">
            {{ row.state }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="会议内容" min-width="200">
        <template #default="{row}">
          <div class="content-cell">
            <div class="content-preview">{{ extractPureText(row.content) }}</div>
            <el-button
                type="text"
                size="small"
                @click="showContentDialog(row)"
                class="view-content-btn"
            >
              查看详情
            </el-button>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="startTime" label="开始时间" width="160"/>
      <el-table-column label="操作" width="280" fixed="right">
        <template #default="scope">
          <div class="table-actions">
            <el-button
                type="primary"
                size="small"
                @click="openDialog(scope.row.id)"
                plain
            >
              <el-icon>
                <Edit/>
              </el-icon>
              修改
            </el-button>
            <el-dropdown @command="(command) => handleDropdownCommand(command, scope.row.id)">
              <el-button size="small" type="info" plain>
                更多
                <el-icon class="el-icon--right">
                  <ArrowDown/>
                </el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="participants">
                    <el-icon>
                      <User/>
                    </el-icon>
                    参会人员
                  </el-dropdown-item>
                  <el-dropdown-item command="enterMeeting" divided>
                    <el-icon>
                      <VideoCamera/>
                    </el-icon>
                    进入会议
                  </el-dropdown-item>
                  <el-dropdown-item command="delete" divided>
                    <el-icon>
                      <Delete/>
                    </el-icon>
                    <span style="color: #f56c6c;">删除</span>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-wrapper">
      <el-pagination
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          :page-size="pageSize"
          :current-page="currentPage"
          :page-sizes="[10, 20, 50, 100]"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
      />
    </div>

    <!-- 添加/编辑会议对话框 -->
    <add-conference-dialog
        v-model="showDialog"
        :conference-id="dialogId"
        @success="fetchConferenceList"
    />

    <!-- 会议内容详情对话框 -->
    <el-dialog
        v-model="contentDialogVisible"
        :title="`会议内容详情 - ${currentConference?.name || ''}`"
        width="70%"
        :before-close="handleContentDialogClose"
    >
      <template #header>
        <div class="dialog-header">
          <span>会议内容详情 - {{ currentConference?.name || '' }}</span>
          <el-button
              type="primary"
              size="small"
              @click="fetchTimelineStatus(currentConference?.id)"
              :loading="timelineLoading"
              class="refresh-btn"
          >
            刷新状态
          </el-button>
        </div>
      </template>

      <div class="content-dialog">
        <div class="conference-info">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="会议名称">
              {{ currentConference?.name }}
            </el-descriptions-item>
            <el-descriptions-item label="创建人">
              {{ currentConference?.userName }}
            </el-descriptions-item>
            <el-descriptions-item label="会议状态">
              <el-tag :type="getStatusType(currentConference?.state)">
                {{ currentConference?.state }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="开始时间">
              {{ currentConference?.startTime }}
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="content-section">
          <h3 class="content-title">会议内容</h3>
          <div class="content-body" v-html="currentConference?.content"></div>
        </div>

        <!-- 会议状态时间线 -->
        <div class="timeline-section">
          <h3 class="content-title">会议状态时间线</h3>
          <!-- 修改后的时间线部分 -->
          <el-timeline :reverse="true" class="horizontal-timeline">
            <!-- 会议开始和结束节点保持不变 -->
            <el-timeline-item
                :timestamp="dayjs(currentConference?.startTime).format('YYYY-MM-DD HH:mm')"
                :type="timelineStatus.startTime"
                size="large"
            >
              会议开始
            </el-timeline-item>

            <el-timeline-item
                :timestamp="dayjs(currentConference?.endTime).format('YYYY-MM-DD HH:mm')"
                :type="timelineStatus.endTime"
                size="large"
            >
              会议结束
            </el-timeline-item>

            <!-- 录屏节点 -->
            <el-timeline-item
                v-if="timelineStatus.recording === 'success'"
                size="large"
                type="success"
            >
              <span class="recording-item" @click="playRecording">
                录屏上传成功 (点击播放)
              </span>
            </el-timeline-item>

            <el-timeline-item
                v-if="timelineStatus.recording === 'none'"
                size="large"
                type="danger"
            >
              无录屏
            </el-timeline-item>

            <!-- 语音转文字节点 - 只有当有录屏时才显示 -->
            <template v-if="timelineStatus.recording === 'success'">
              <el-timeline-item
                  v-if="timelineStatus.transcription === 'success'"
                  size="large"
                  type="success"
              >
                <span class="action-item" @click="fetchTranscription">
                  语音转文字成功 (点击查看)
                </span>
              </el-timeline-item>
              <el-timeline-item
                  v-if="timelineStatus.transcription === 'processing'"
                  size="large"
                  type="success"
              >
                语音转文字中
              </el-timeline-item>
              <el-timeline-item
                  v-else
                  size="large"
                  type="danger"
              >
                <span>未把语音转成为文字</span>
                <el-button
                    type="text"
                    size="small"
                    @click="generateMindmap"
                    :loading="generatingMindmap"
                    class="generate-btn"
                >
                  语音转文字
                </el-button>
              </el-timeline-item>
            </template>

            <!-- 会议纪要和思维导图节点 - 只有当有语音转文字时才显示 -->
            <template v-if="timelineStatus.transcription === 'success'">
              <!-- 会议纪要节点 -->
              <el-timeline-item
                  v-if="timelineStatus.minutes === 'success'"
                  size="large"
                  type="success"
              >
                <span class="action-item" @click="fetchMinutesContent">
                  生成会议纪要成功 (点击查看)
                </span>
              </el-timeline-item>
              <el-timeline-item
                  v-if="timelineStatus.minutes === 'processing'"
                  size="large"
                  type="warning"
              >
                <span>生成会议纪要中...</span>
              </el-timeline-item>
              <el-timeline-item
                  v-if="timelineStatus.minutes === 'none'"
                  size="large"
                  type="danger"
              >
                <span>未生成会议纪要</span>
                <el-button
                    type="text"
                    size="small"
                    @click="generateMinutes"
                    :loading="generatingMinutes"
                    class="generate-btn"
                >
                  生成会议纪要
                </el-button>
              </el-timeline-item>

              <!-- 思维导图节点 -->
              <el-timeline-item
                  v-if="timelineStatus.mindmap === 'success'"
                  size="large"
                  type="success"
              >
                <span class="action-item" @click="fetchMindmapContent">
                  生成思维导图成功 (点击查看)
                </span>
              </el-timeline-item>
              <el-timeline-item
                  v-if="timelineStatus.mindmap === 'processing'"
                  size="large"
                  type="warning"
              >
                <span>生成思维导图中...</span>
              </el-timeline-item>
              <el-timeline-item
                  v-if="timelineStatus.mindmap === 'none'"
                  size="large"
                  type="danger"
              >
                <span>未生成思维导图</span>
                <el-button
                    type="text"
                    size="small"
                    @click="generateMindmap"
                    :loading="generatingMindmap"
                    class="generate-btn"
                >
                  生成思维导图
                </el-button>
              </el-timeline-item>
            </template>
          </el-timeline>
        </div>
      </div>

      <template #footer>
        <span class="dialog-footer">
            <el-button @click="contentDialogVisible = false">关闭</el-button>
            <el-button type="primary" @click="openDialog(currentConference?.id)">
                编辑会议
            </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 会议纪要对话框 -->
    <el-dialog
        v-model="minutesDialogVisible"
        title="会议纪要"
        width="60%"
    >
      <div class="minutes-content" v-html="minutesContent"></div>
      <template #footer>
        <el-button type="primary" @click="downloadContent(minutesContent, '会议纪要.html', 'text/html')">
          下载HTML
        </el-button>
      </template>
    </el-dialog>

    <!-- 思维导图对话框 -->
    <el-dialog
        v-model="mindmapDialogVisible"
        title="会议思维导图"
        width="80%"
        fullscreen
    >
      <div class="mindmap-container">
        <MindMap
            :data="mindmapData"
            :width="1000"
            :height="700"
            :colors="customColors"
            :max-depth="3"
            :auto-fit="true"
        />
      </div>
    </el-dialog>

    <!-- 参会人员对话框 -->
    <el-dialog
        v-model="participantsDialogVisible"
        :title="`参会人员 - ${currentConferenceName}`"
        width="50%"
    >
      <el-table :data="participantsList" border>
        <el-table-column prop="name" label="姓名" width="180"/>
        <el-table-column prop="unit" label="单位" width="180"/>
        <el-table-column prop="gender" label="性别" width="180"/>
        <el-table-column prop="phone" label="☎电话" width="180"/>
        <el-table-column prop="email" label="📫邮箱" width="180"/>
      </el-table>
      <template #footer>
        <el-button type="primary" @click="participantsDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts">
import {defineComponent, ref} from 'vue'
import AddEditConferenceDialog from '../components/AddEditConferenceDialog.vue'
import axios, {type CancelTokenSource} from "axios";
import {ElMessage, ElMessageBox} from "element-plus";
import {VideoCamera} from '@element-plus/icons-vue'
import dayjs from "dayjs";
import {useRouter} from 'vue-router'

// 在 setup 中

import {
  Clock,
  Check,
  VideoPlay,
  Plus,
  Edit,
  Delete,
  User,
  ArrowDown
} from '@element-plus/icons-vue'
import MindMap from "@/components/MindMap.vue";

export default defineComponent({
  name: 'ConferenceListView',
  methods: {dayjs},
  components: {
    MindMap,
    AddConferenceDialog: AddEditConferenceDialog,
    Clock,
    Check,
    VideoPlay,
    Plus,
    Edit,
    Delete,
    User,
    ArrowDown,
    VideoCamera
  },
  setup() {
    const router = useRouter()
    const showDialog = ref(false)
    const dialogId = ref<number | undefined>(undefined)
    const contentDialogVisible = ref(false)
    const currentConference = ref<Conference | null>(null)
    const currentPage = ref(1)
    const pageSize = ref(10)
    const total = ref(0)
    const recordingUrl = ref<string | null>(null)
    const minutesDialogVisible = ref(false)
    const mindmapDialogVisible = ref(false)
    const transcription = ref('')
    const minutesContent = ref('')
    const mindmapImageUrl = ref('')
    const timelineLoading = ref(false)
    const participantsDialogVisible = ref(false)
    const participantsList = ref<Participant[]>([])
    const currentConferenceName = ref('')

    // 时间线状态
    const timelineStatus = ref({
      startTime: 'grey',
      endTime: 'grey',
      recording: 'none', // 'none' | 'processing' | 'success'
      transcription: 'none', // 'none' | 'processing' | 'success'
      minutes: 'none',    // 'none' | 'processing' | 'success'
      mindmap: 'none'     // 'none' | 'processing' | 'success'
    })


    interface Conference {
      id: number
      name: string
      userName: string
      state: keyof typeof stateMap
      endTime?: string
      content: string
      startTime?: string
    }

    interface Participant {
      name: string
      unit: string
      gender: string
      phone: string
      email: string
      conferenceName: string
    }

    const conferenceList = ref<Conference[]>([])
    const searchLoading = ref(false)

    const searchForm = ref({
      keyword: '',
      status: '',
      dateRange: []
    })

    const stateMap = {
      UNDER_CHECK: '审核中',
      APPROVED: '已通过',
      REJECTED: '已拒绝',
      ONGOING: '进行中',
      COMPLETED: '已完成'
    }

    const openDialog = (id?: number) => {
      dialogId.value = id
      showDialog.value = true
    }

    const filterByState = (state: keyof typeof stateMap) => {
      searchForm.value.status = state
      handleSearch()
    }

    // 新增下拉菜单处理函数
    const handleDropdownCommand = (command: string, id: number) => {
      switch (command) {
        case 'participants':
          showParticipants(id)
          break
        case 'enterMeeting':
          enterMeeting(id)  // 新增进入会议命令
          break
        case 'delete':
          handleDelete(id)
          break
      }
    }

    const enterMeeting = async (conferenceId: number) => {
      try {
        // 获取会议角色信息（这里假设API返回用户是否是创建者）
        let role = 'user'
        const conference = conferenceList.value.find(c => c.id === conferenceId)
        if (!conference) {
          throw new Error('会议不存在')
        }
        if (conference.userName === localStorage.getItem('username')) {
          role = 'creator'
        }
        // 跳转到会议页面
        router.push({
          name: 'MeetingRole',
          params: {
            id: conferenceId,
            role: role
          }
        })
      } catch (err) {
        ElMessage.error('进入会议失败')
        console.error(err)
      }
    }

    // 新增页面大小改变处理函数
    const handleSizeChange = (size: number) => {
      pageSize.value = size
      currentPage.value = 1
      fetchConferenceList()
    }

    const showContentDialog = async (conference: Conference) => {
      currentConference.value = conference
      contentDialogVisible.value = true

      // 初始化时间线状态
      timelineStatus.value = {
        startTime: 'grey',
        endTime: 'grey',
        recording: 'none',
        transcription: 'none',
        minutes: 'none',
        mindmap: 'none'
      }

      // 获取时间线状态
      await fetchTimelineStatus(conference.id)
    }

    const showParticipants = async (conferenceId: number) => {
      try {
        const res = await axios.get('/receipt/participants', {
          params: {conferenceId}
        })

        if (res.data.code === 200) {
          participantsList.value = res.data.data || []
          currentConferenceName.value = participantsList.value[0]?.conferenceName || '未知会议'
          participantsDialogVisible.value = true
        } else {
          ElMessage.error(res.data.message || '获取参会人员失败')
        }
      } catch (err) {
        ElMessage.error('获取参会人员失败')
        console.error(err)
      }
    }

    const getParticipantStatusType = (status: string) => {
      switch (status) {
        case '已确认':
          return 'success'
        case '待确认':
          return 'warning'
        case '已拒绝':
          return 'danger'
        default:
          return 'info'
      }
    }

    const fetchTimelineStatus = async (conferenceId: number) => {
      timelineLoading.value = true
      try {
        const res = await axios.get('/conference/timeline-status', {
          params: {conferenceId}
        })

        if (res.data.code === 200) {
          const data = res.data.data
          const now = dayjs()

          // 更新基础时间线状态
          timelineStatus.value.startTime = now.isAfter(dayjs(data.startTime)) ? 'success' : 'grey'
          timelineStatus.value.endTime = now.isAfter(dayjs(data.endTime)) ? 'success' : 'grey'
          timelineStatus.value.recording = data.hasRecording

          // 更新状态节点
          timelineStatus.value.transcription = data.hasTranscription
          timelineStatus.value.minutes = data.hasMinutes
          timelineStatus.value.mindmap = data.hasMindMap

          // 保存录屏URL
          recordingUrl.value = data.recordingUrl || null

          ElMessage.success('状态已刷新')
        }
      } catch (err) {
        console.error('获取时间线状态失败:', err)
        ElMessage.error('刷新状态失败')
      } finally {
        timelineLoading.value = false
      }
    }

    const handleContentDialogClose = (done: () => void) => {
      currentConference.value = null
      done()
    }

    const getStatusType = (status: string) => {
      switch (status) {
        case '审核中':
          return 'info'
        case '已通过':
          return 'success'
        case '已拒绝':
          return 'danger'
        case '进行中':
          return 'warning'
        case '已完成':
          return ''
        default:
          return 'info'
      }
    }

    const resetSearch = () => {
      searchForm.value = {
        keyword: '',
        status: '',
        dateRange: []
      }
      currentPage.value = 1
      fetchConferenceList()
    }

    const cancelTokenSource = ref<CancelTokenSource | null>(null)

    interface SearchRequestBody {
      keyword: string | null;
      status: string | null;
      startTime: any | null;
      endTime: any | null;

      [key: string]: any;
    }

    const fetchConferenceList = async () => {
      if (cancelTokenSource.value) {
        cancelTokenSource.value.cancel('Operation canceled due to new request.')
      }

      cancelTokenSource.value = axios.CancelToken.source()
      searchLoading.value = true

      try {
        const requestBody: SearchRequestBody = {
          keyword: searchForm.value.keyword?.trim() || null,
          status: searchForm.value.status || null,
          startTime: searchForm.value.dateRange?.[0] || null,
          endTime: searchForm.value.dateRange?.[1] || null
        }

        Object.keys(requestBody).forEach(key => {
          if (requestBody[key] === undefined || requestBody[key] === '') {
            requestBody[key] = null
          }
        })

        const params = {
          page: currentPage.value,
          pageSize: pageSize.value,
        }

        const res = await axios.post('/conference/get', requestBody, {
          params,
          cancelToken: cancelTokenSource.value.token
        })

        if (res.data.code === 200) {
          conferenceList.value = (res.data.data || []).map((item: Conference) => ({
            ...item,
            state: stateMap[item.state] || item.state,
            startTime: dayjs(item.startTime).format('YYYY-MM-DD HH:mm')
          }))
          total.value = res.data.total || 0
        } else {
          ElMessage.error(res.data.message || '获取会议列表失败')
        }
      } catch (err) {
        if (!axios.isCancel(err)) {
          ElMessage.error('获取会议列表失败')
          console.error(err)
        }
      } finally {
        searchLoading.value = false
      }
    }

    const debounce = (fn: Function, delay: number) => {
      let timer: ReturnType<typeof setTimeout>
      return (...args: any[]) => {
        clearTimeout(timer)
        timer = setTimeout(() => fn(...args), delay)
      }
    }

    const debouncedSearch = debounce(fetchConferenceList, 500)

    const handleSearch = () => {
      currentPage.value = 1
      debouncedSearch()
    }

    const handlePageChange = (page: number) => {
      currentPage.value = page
      fetchConferenceList()
    }

    const handleDelete = (id?: number) => {
      ElMessageBox.confirm('确定要删除该会议吗?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async () => {
        try {
          const res = await axios.get(`/conference/delete?id=${id}`)
          if (res.data.code === 200) {
            ElMessage.success('删除成功')
            fetchConferenceList()
          } else {
            ElMessage.error(res.data.message || '删除失败')
          }
        } catch (err) {
          ElMessage.error('删除失败')
          console.error(err)
        }
      }).catch(() => {
        // 取消删除
      })
    }

    const playRecording = () => {
      if (recordingUrl.value) {
        window.open(recordingUrl.value, '_blank')
      }
    }

    const fetchTranscription = async () => {
      try {
        const res = await axios.get('/conference/get-transcription', {
          params: {conferenceId: currentConference.value?.id}
        })
        if (res.data.code === 200) {
          transcription.value = res.data.data.transcription
          minutesDialogVisible.value = true
        } else {
          ElMessage.error(res.data.message || '语音转文字失败')
        }
      } catch (err) {
        ElMessage.error('语音转文字失败')
        console.error(err)
      }
    }

    const fetchMinutesContent = async () => {
      try {
        const res = await axios.get('/conference/get-minutes', {
          params: {conferenceId: currentConference.value?.id}
        })
        if (res.data.code === 200) {
          minutesContent.value = res.data.data
          minutesDialogVisible.value = true
        } else {
          ElMessage.error(res.data.message || '获取会议纪要失败')
        }
      } catch (err) {
        ElMessage.error('获取会议纪要失败')
        console.error(err)
      }
    }

    const mindmapData = ref(null);

    const fetchMindmapContent = async () => {
      try {
        const res = await axios.get('/conference/get-mindmap', {
          params: {conferenceId: currentConference.value?.id}
        })
        if (res.data.code === 200) {
          // 假设返回的JSON数据可以直接用于渲染思维导图
          console.log(res.data.data);
          mindmapData.value = JSON.parse(res.data.data);
          console.log(mindmapData);
          mindmapDialogVisible.value = true
        } else {
          ElMessage.error(res.data.message || '获取思维导图失败')
        }
      } catch (err) {
        ElMessage.error('获取思维导图失败')
        console.error(err)
      }
    }

    const downloadContent = (content: string, filename: string, type: string) => {
      if (!content) return

      const blob = new Blob([content], {type})
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }

    const extractPureText = (html: string) => {
      if (!html) return '';

      try {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        const videos = tempDiv.querySelectorAll('video, [data-w-e-type="video"], .video-container, .w-e-video-container, iframe, embed, object');
        videos.forEach(element => element.remove());

        let pureText = tempDiv.textContent || tempDiv.innerText || '';
        pureText = pureText
            .replace(/\s+/g, ' ')
            .replace(/\n+/g, ' ')
            .trim();

        if (!pureText || pureText.length === 0) {
          return '内容为空或仅包含媒体文件';
        }

        const maxLength = 50;
        if (pureText.length > maxLength) {
          return pureText.substring(0, maxLength) + '...';
        }

        return pureText;
      } catch (error) {
        console.error('提取纯文本时出错:', error);
        return '内容解析失败';
      }
    }

    // 在 setup 中添加状态
    const generatingTranscription = ref(false)
    const generatingMinutes = ref(false)
    const generatingMindmap = ref(false)

// 添加生成方法
    const generateTranscription = async () => {
      if (!currentConference.value?.id) return

      generatingTranscription.value = true
      try {
        const res = await axios.post('/conference/generate-transcription', {
          conferenceId: currentConference.value.id
        })

        if (res.data.code === 200) {
          ElMessage.success('语音转文字中，请稍后刷新查看')
          timelineStatus.value.minutes = 'processing'
        } else {
          ElMessage.error(res.data.message || '语音转文字失败')
        }
      } catch (err) {
        ElMessage.error('生成会议纪要失败')
        console.error(err)
      } finally {
        generatingTranscription.value = false
      }
    }

    const generateMinutes = async () => {
      if (!currentConference.value?.id) return

      generatingMinutes.value = true
      try {
        const res = await axios.get(`/conference/generate-minutes?conferenceId=${currentConference.value.id}`)

        if (res.data.code === 200) {
          ElMessage.success('会议纪要生成中，请稍后刷新查看')
          timelineStatus.value.minutes = 'processing'
        } else {
          ElMessage.error(res.data.message || '生成会议纪要失败')
        }
      } catch (err) {
        ElMessage.error('生成会议纪要失败')
        console.error(err)
      } finally {
        generatingMinutes.value = false
      }
    }

    const generateMindmap = async () => {
      if (!currentConference.value?.id) return

      generatingMindmap.value = true
      try {
        const res = await axios.get(`/conference/generate-mindmap?conferenceId=${currentConference.value.id}`)

        if (res.data.code === 200) {
          ElMessage.success('思维导图生成中，请稍后刷新查看')
          timelineStatus.value.mindmap = 'processing'
        } else {
          ElMessage.error(res.data.message || '生成思维导图失败')
        }
      } catch (err) {
        ElMessage.error('生成思维导图失败')
        console.error(err)
      } finally {
        generatingMindmap.value = false
      }
    }

    // 初始化获取数据
    fetchConferenceList()

    return {
      showDialog,
      dialogId,
      openDialog,
      searchForm,
      conferenceList,
      handleSearch,
      handleDelete,
      currentPage,
      pageSize,
      total,
      handlePageChange,
      handleSizeChange,
      fetchConferenceList,
      extractPureText,
      contentDialogVisible,
      currentConference,
      showContentDialog,
      handleContentDialogClose,
      getStatusType,
      filterByState,
      resetSearch,
      searchLoading,
      timelineStatus,
      playRecording,
      minutesDialogVisible,
      mindmapDialogVisible,
      minutesContent,
      mindmapImageUrl,
      fetchMinutesContent,
      fetchTranscription,
      fetchMindmapContent,
      downloadContent,
      fetchTimelineStatus,
      timelineLoading,
      showParticipants,
      participantsDialogVisible,
      participantsList,
      currentConferenceName,
      getParticipantStatusType,
      handleDropdownCommand,
      generatingTranscription,
      generatingMinutes,
      generatingMindmap,
      generateMinutes,
      generateMindmap,
      mindmapData,
      customColors: [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
        '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43'
      ]
    }
  }
})
</script>

<style scoped>
.mb-2 {
  margin-bottom: 10px;
}

.mb-4 {
  margin-bottom: 16px;
}

.mt-4 {
  margin-top: 16px;
}

.content-cell {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.content-preview {
  color: #666;
  font-size: 14px;
  line-height: 1.4;
}

.view-content-btn {
  align-self: flex-start;
  padding: 0;
  font-size: 12px;
  color: #409eff;
}

.view-content-btn:hover {
  color: #66b1ff;
}

.content-dialog {
  max-height: 70vh;
  overflow-y: auto;
}

.conference-info {
  margin-bottom: 24px;
}

.content-section {
  border-top: 1px solid #ebeef5;
  padding-top: 20px;
}

.content-title {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.content-body {
  background: #fafafa;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 16px;
  min-height: 200px;
  line-height: 1.6;
}

.content-body :deep(img) {
  max-width: 100%;
  height: auto;
}

.content-body :deep(video) {
  max-width: 100%;
  height: auto;
}

.content-body :deep(p) {
  margin: 8px 0;
}

.content-body :deep(h1),
.content-body :deep(h2),
.content-body :deep(h3),
.content-body :deep(h4),
.content-body :deep(h5),
.content-body :deep(h6) {
  margin: 16px 0 8px 0;
  font-weight: 600;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.recording-item {
  cursor: pointer;
  margin-right: 10px;
}

.recording-item:hover {
  color: #66b1ff;
}

.delete-recording-btn {
  margin-left: 10px;
}

.action-item {
  cursor: pointer;
}

.action-item:hover {
  color: #66b1ff;
  text-decoration: underline;
}

.minutes-content {
  max-height: 60vh;
  overflow-y: auto;
}

.mindmap-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.mindmap-container img {
  max-width: 100%;
  max-height: 80vh;
  object-fit: contain;
}
</style>