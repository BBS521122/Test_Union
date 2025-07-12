<template>
  <el-dialog
      v-model="dialogVisible"
      title="回收站"
      width="60%"
  >
    <el-table
        :data="recycleNews"
        border
        stripe
        v-loading="loading"
        style="width: 100%"
        :row-key="row => row.id"
        ref="tableRef"
    >
      <el-table-column
          type="selection"
          width="55"
      ></el-table-column>

      <el-table-column prop="title" label="新闻标题" />
      <el-table-column prop="author" label="作者" />
      <el-table-column prop="summary" label="简介" />
      <el-table-column v-if="role==='ADMIN'" prop="status" label="状态">
        <template #default="{ row }">
          <el-tag :type="statusTagType(row.status)">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180">
        <template #default="scope">
          <el-button type="primary" size="small" @click="restoreNews(scope.row)">恢复</el-button>
          <el-button type="danger" size="small" @click="deleteForever(scope.row)">彻底删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <template #footer>
      <el-button
          type="primary"
          :disabled="!hasSelection"
          @click="restoreSelected"
          style="margin-right: 10px;"
      >
        批量恢复
      </el-button>
      <el-button
          type="danger"
          :disabled="!hasSelection"
          @click="deleteSelected"
          style="margin-right: 30px;"
      >
        批量彻底删除
      </el-button>

      <el-button @click="dialogVisible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'

const props = defineProps<{
  modelValue: boolean
  tenantId?: number
  role?: 'ADMIN' | 'user'
}>()
const emit = defineEmits<{ (e: 'update:modelValue', val: boolean): void; (e: 'reloaded'): void }>()

const dialogVisible = ref(false)
const recycleNews = ref<any[]>([])
const loading = ref(false)
const tableRef = ref<any>(null)

watch(() => props.modelValue, (newVal) => {
  dialogVisible.value = newVal
  if (newVal) loadRecycleNews()
})

watch(dialogVisible, (newVal) => emit('update:modelValue', newVal))
function statusTagType(status: string): string {
  switch (status) {
    case '已通过': return 'success'
    case '待审核': return 'warning'
    case '已拒绝': return 'danger'
    default: return ''
  }
}
function loadRecycleNews() {
  loading.value = true

  const url = props.role === 'ADMIN'
      ? 'http://localhost:8080/api/news/recycle-bin'
      : `http://localhost:8080/api/news/recycle-bin?tenantId=${props.tenantId}`

  axios.get(url)
      .then(res => { recycleNews.value = res.data })
      .catch(() => ElMessage.error('加载回收站失败'))
      .finally(() => { loading.value = false })
}

async function restoreNews(row: any) {
  try {
    await axios.put(`http://localhost:8080/api/news/restore/${row.id}`)
    ElMessage.success('恢复成功')
    emit('reloaded')
    loadRecycleNews()
  } catch (error) {
    ElMessage.error('恢复新闻失败')
  }
}


async function restoreSelected() {
  const ids = getSelectedIds()
  if (!ids.length) return ElMessage.warning('请选择要恢复的新闻')

  try {
    await axios.put('http://localhost:8080/api/news/restore-batch', ids)
    ElMessage.success(`成功恢复 ${ids.length} 条新闻`)
    emit('reloaded')
    loadRecycleNews()
  } catch (error) {
    ElMessage.error('批量恢复失败')
  }
}


function deleteForever(row: any) {
  ElMessageBox.confirm(`将永久删除 "${row.title}"，是否继续？`, '警告', { type: 'warning' })
      .then(() => axios.delete(`http://localhost:8080/api/news/hard-delete/${row.id}`))
      .then(() => {
        ElMessage.success('已彻底删除')
        loadRecycleNews()
      })
      .catch(() => ElMessage.info('取消删除'))
}

function deleteSelected() {
  const ids = getSelectedIds()
  if (!ids.length) return ElMessage.warning('请选择要彻底删除的新闻')

  ElMessageBox.confirm(`将永久删除 ${ids.length} 条新闻，是否继续？`, '警告', { type: 'warning' })
      .then(() => Promise.all(ids.map(id => axios.delete(`http://localhost:8080/api/news/hard-delete/${id}`))))
      .then(() => {
        ElMessage.success(`已彻底删除 ${ids.length} 条新闻`)
        loadRecycleNews()
      })
      .catch(() => ElMessage.info('取消删除'))
}

const hasSelection = computed(() => tableRef.value?.getSelectionRows().length > 0)
function getSelectedIds(): number[] {
  return tableRef.value?.getSelectionRows().map((row: any) => row.id) || []
}
</script>