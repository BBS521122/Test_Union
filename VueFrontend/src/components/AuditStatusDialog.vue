<template>
  <el-dialog
      v-model="visible"
      title="我的资讯审核状态"
      width="60%"
      @close="emit('update:modelValue', false)"
  >
    <!-- 搜索框 -->
    <el-input
        v-model="searchTitle"
        placeholder="按标题搜索"
        clearable
        style="max-width: 300px; margin-bottom: 12px"
    />

    <!-- 表格展示 -->
    <el-table :data="pagedNews" stripe border style="width: 100%">
      <el-table-column prop="title" label="标题" />
      <el-table-column prop="author" label="作者" />
      <el-table-column prop="summary" label="简介" />
      <el-table-column prop="status" label="状态">
        <template #default="{ row }">
          <el-tag :type="statusTagType(row.status)">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180">
        <template #default="{ row }">
          <el-tooltip v-if="row.status === '待审核'" content="审核中不可修改" placement="top">
            <el-button type="text" size="small" disabled>修改</el-button>
          </el-tooltip>
          <el-button
              v-else
              type="text"
              size="small"
              @click="editRow(row)"
          >修改</el-button>

          <el-button
              type="text"
              size="small"
              style="color: red"
              @click="deleteRow(row)"
          >删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页器 -->
    <el-pagination
        background
        layout="prev, pager, next"
        :total="filteredNews.length"
        :page-size="pageSize"
        :current-page="currentPage"
        @current-change="handlePageChange"
        style="margin-top: 12px; text-align: right"
    />

    <!-- 编辑弹窗 -->
    <NewsDialog
        :key="dialogKey"
        v-model:visible="dialogVisible"
        :isEdit="true"
        :isAdmin="false"
        :modelValue="form"
        :maxSortOrder="maxSortOrder"
        @save="handleSave"
        @cancel="handleCancel"
    />
  </el-dialog>
</template>

<script setup lang="ts">
import {ref, watch, nextTick, computed, defineAsyncComponent} from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'

const NewsDialog = defineAsyncComponent(() => import('./NewsDialog.vue'))

interface NewsItem {
  id: number
  title: string
  author: string
  summary: string
  imagePath: string
  sortOrder: number
  content: string
  status: string
}

const props = defineProps<{
  modelValue: boolean
  tenantId: number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'reloaded'): void
}>()


const visible = ref(false)
const newsList = ref<NewsItem[]>([])

const dialogVisible = ref(false)
const dialogKey = ref(0)
const form = ref<NewsItem | any>({})
const maxSortOrder = ref(100) // 默认最大排序值，建议从后台获取

// 搜索和分页状态
const searchTitle = ref('')
const currentPage = ref(1)
const pageSize = 5

// 搜索过滤
const filteredNews = computed(() => {
  if (!searchTitle.value) return newsList.value
  return newsList.value.filter(n => n.title.includes(searchTitle.value))
})

// 分页数据
const pagedNews = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredNews.value.slice(start, start + pageSize)
})

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val) {
    searchTitle.value = ''
    currentPage.value = 1
    loadMyNews()
  }
})

function statusTagType(status: string): string {
  switch (status) {
    case '已通过': return 'success'
    case '待审核': return 'warning'
    case '已拒绝': return 'danger'
    default: return ''
  }
}

async function loadMyNews() {
  try {
    const res = await axios.get(`http://localhost:8080/api/news?tenantId=${props.tenantId}`)
    newsList.value = res.data
  } catch (err) {
    ElMessage.error('加载资讯失败')
  }
}

function handlePageChange(page: number) {
  currentPage.value = page
}

async function editRow(row: NewsItem) {
  dialogVisible.value = false
  await nextTick()
  form.value = { ...row }
  dialogKey.value++
  dialogVisible.value = true
}

async function deleteRow(row: NewsItem) {
  ElMessageBox.confirm(`确认删除资讯：${row.title}？`, '提示')
      .then(async () => {
        await axios.delete(`http://localhost:8080/api/news/${row.id}`)
        ElMessage.success('删除成功')
        await loadMyNews()
        emit('reloaded')
      })
      .catch(() => {
        ElMessage.info('取消删除')
      })

}

async function handleSave(news: NewsItem) {
  try {
    // 只支持修改，必须有 id
    if (!news.id) {
      ElMessage.error('无效的新闻ID，无法修改')
      return
    }

    // 调用后端接口更新新闻
    await axios.put(`http://localhost:8080/api/news/${news.id}`, news)

    ElMessage.success('资讯修改成功')
    dialogVisible.value = false
    await loadMyNews() // 重新加载列表数据
    emit('reloaded')

  } catch (error) {
    console.error(error)
    ElMessage.error('资讯修改失败')
  }
}

function handleCancel() {
  dialogVisible.value = false
}

</script>


<style scoped>
.el-tag.success {
  color: #67c23a;
  background-color: #f0f9eb;
}
.el-tag.warning {
  color: #e6a23c;
  background-color: #fdf6ec;
}
.el-tag.danger {
  color: #f56c6c;
  background-color: #fef0f0;
}
</style>