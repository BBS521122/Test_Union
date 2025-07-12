<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'

interface NewsItem {
  id?: number
  title: string
  imagePath: string
  sortOrder: number
  author: string
  summary: string
  content: string
  status?: string
  tenantId: number
}

const visible = ref(false)
// props
const props = defineProps<{
  modelValue: boolean
}>()
const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'reloaded'): void
}>()


watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val) {
    loadAuditNews()
  }
})

// 分页及搜索状态
const auditNews = ref<NewsItem[]>([])
const searchTitle = ref('')
const currentPage = ref(1)
const pageSize = 5

const filteredNews = computed(() => {
  if (!searchTitle.value) return auditNews.value
  return auditNews.value.filter(n => n.title.includes(searchTitle.value))
})

const pagedNews = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredNews.value.slice(start, start + pageSize)
})

async function loadAuditNews() {
  try {
    const res = await axios.get('http://localhost:8080/api/news?status=待审核')
    auditNews.value = res.data
  } catch {
    ElMessage.error('加载待审核新闻失败')
  }
}

function handleClose() {
  emit('update:modelValue', false)
}

function handlePageChange(page: number) {
  currentPage.value = page
}

async function approve(news: NewsItem) {
  try {
    await axios.put(`http://localhost:8080/api/news/approve/${news.id}`)
    ElMessage.success(`已通过：${news.title}`)
    await loadAuditNews()
    emit('reloaded')
  } catch {
    ElMessage.error('操作失败')
  }
}

async function reject(news: NewsItem) {
  try {
    await axios.put(`http://localhost:8080/api/news/reject/${news.id}`)
    ElMessage.success(`已拒绝：${news.title}`)
    await loadAuditNews()
    emit('reloaded')
  } catch {
    ElMessage.error('操作失败')
  }
}
</script>

<template>
  <el-dialog
      :model-value="props.modelValue"
      @update:modelValue="emit('update:modelValue', $event)"
      title="审核待审批新闻"
      width="60%"
      @close="handleClose"
  >
    <el-input
        v-model="searchTitle"
        placeholder="按标题搜索"
        clearable
        style="max-width: 300px; margin-bottom: 12px"
    />

    <el-table
        :data="pagedNews"
        stripe
        border
        style="width: 100%"
    >
      <el-table-column prop="title" label="标题" />
      <el-table-column prop="author" label="作者" />
      <el-table-column prop="summary" label="简介" />
      <el-table-column label="操作" width="180">
        <template #default="{ row }">
          <el-button size="small" type="success" @click="approve(row)">通过</el-button>
          <el-button size="small" type="danger" @click="reject(row)">拒绝</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
        background
        layout="prev, pager, next"
        :total="filteredNews.length"
        :page-size="pageSize"
        :current-page="currentPage"
        @current-change="handlePageChange"
        style="margin-top: 12px; text-align: right"
    />
  </el-dialog>
</template>