<template>
  <div class="customer-management">
    <!-- 查询条件区 -->
    <el-row :gutter="10" class="search-bar">
      <el-col :span="4">
        <el-input v-model="filters.id" placeholder="租户标识" clearable/>
      </el-col>
      <el-col :span="4">
        <el-input v-model="filters.contact" placeholder="联系人" clearable/>
      </el-col>
      <el-col :span="4">
        <el-input v-model="filters.phone" placeholder="电话" clearable/>
      </el-col>
      <el-col :span="4">
        <el-input v-model="filters.name" placeholder="租户名称" clearable/>
      </el-col>
      <el-col :span="2">
        <el-button type="primary" @click="handleSearch">搜索</el-button>
      </el-col>
    </el-row>

    <!-- 按钮操作区 -->
    <div style="margin: 10px 0;">
      <el-button type="primary" @click="openDialog()">+ 新增</el-button>
      <el-button type="danger" @click="handleBatchDelete" :disabled="!multipleSelection.length">
        批量删除
      </el-button>
    </div>

    <!-- 表格区 -->
    <el-table
        :data="tableData"
        border
        style="width: 100%"
        @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="55"/>
      <el-table-column prop="id" label="租户标识" width="100"/>
      <el-table-column prop="contactPerson" label="联系人"/>
      <el-table-column prop="phone" label="电话"/>
      <el-table-column prop="name" label="租户名称"/>
      <el-table-column prop="admin" label="管理员"/>
      <el-table-column label="操作" width="180">
        <template #default="scope">
          <el-button type="primary" size="small" @click="openDialog(scope.row.id)">修改</el-button>
          <el-button type="danger" size="small" @click="handleDelete(scope.row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div style="margin-top: 20px; text-align: right;">
      <el-pagination
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          :page-size="pageSize"
          :current-page="currentPage"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
      />
    </div>

    <!-- 添加/编辑租户对话框 -->
    <add-edit-tenant
        v-model="showDialog"
        :tenant-id="dialogId"
        @success="fetchTenantList"
    />
  </div>
</template>

<script setup lang="ts">
import {ref, watch} from 'vue'
import AddEditTenant from '../components/AddEditTenant.vue'
import {ElMessage, ElMessageBox} from 'element-plus'
import axios, {type CancelTokenSource} from 'axios'

interface Tenant {
  id: string
  contactPerson: string
  phone: string
  name: string
  admin: string
}

// 查询条件
const filters = ref({
  id: '',
  contact: '',
  phone: '',
  name: ''
})

// 表格数据
const tableData = ref<Tenant[]>([])
const multipleSelection = ref<Tenant[]>([])
const total = ref(0)
const pageSize = ref(10)
const currentPage = ref(1)
const showDialog = ref(false)
const dialogId = ref<number | undefined>(undefined)
const searchLoading = ref(false)

const openDialog = (id?: number) => {
  dialogId.value = id
  showDialog.value = true
}

interface SearchRequestBody {
  id: string | null
  contact: string | null
  phone: string | null
  name: string | null

  [key: string]: any;     // 添加索引签名
}

interface QueryParams {
  page: number
  pageSize: number
}

// 获取租户列表
const cancelTokenSource = ref<CancelTokenSource | null>(null)

const fetchTenantList = async () => {
  if (cancelTokenSource.value) {
    cancelTokenSource.value.cancel('Operation canceled due to new request.')
  }

  cancelTokenSource.value = axios.CancelToken.source()
  searchLoading.value = true

  try {
    // 构建请求体参数
    const requestBody: SearchRequestBody = {
      id: filters.value.id.trim() || null,
      contact: filters.value.contact.trim() || null,
      phone: filters.value.phone.trim() || null,
      name: filters.value.name.trim() || null
    }

    // 构建查询参数
    const queryParams: QueryParams = {
      page: currentPage.value,
      pageSize: pageSize.value
    }

    // 清理空值请求参数
    Object.keys(requestBody).forEach(key => {
      if (requestBody[key] === null || requestBody[key] === undefined) {
        delete requestBody[key]
      }
    })

    const res = await axios.post('/tenant/get', requestBody, {
      params: queryParams,
      cancelToken: cancelTokenSource.value.token
    })

    if (res.data.code === 200) {
      tableData.value = res.data.data || []
      total.value = res.data.total || 0
    } else {
      ElMessage.error(res.data.message || '获取租户列表失败')
    }
  } catch (err) {
    if (!axios.isCancel(err)) {
      ElMessage.error('获取租户列表失败')
      console.error(err)
    }
  } finally {
    searchLoading.value = false
  }
}

// 防抖搜索
const debounce = (fn: Function, delay: number) => {
  let timer: ReturnType<typeof setTimeout>
  return (...args: any[]) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

const debouncedSearch = debounce(fetchTenantList, 500)

// 搜索
const handleSearch = () => {
  currentPage.value = 1
  debouncedSearch()
}

// 重置搜索
const resetSearch = () => {
  filters.value = {
    id: '',
    contact: '',
    phone: '',
    name: ''
  }
  currentPage.value = 1
  fetchTenantList()
}

// 删除租户
const handleDelete = async (id: string) => {
  try {
    await ElMessageBox.confirm('确定要删除该租户吗?', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const res = await axios.get(`/tenant/delete?id=${id}`)
    if (res.data.code === 200) {
      ElMessage.success('删除成功')
      fetchTenantList()
    } else {
      ElMessage.error(res.data.message || '删除失败')
    }
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('删除失败')
      console.error(err)
    }
  }
}

// 批量删除
const handleBatchDelete = async () => {
  if (!multipleSelection.value.length) return

  try {
    await ElMessageBox.confirm('确定要删除选中的租户吗?', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const ids = multipleSelection.value.map(item => item.id)
    const res = await axios.post('/tenant/batch-delete', { ids })

    if (res.data.code === 200) {
      ElMessage.success('批量删除成功')
      fetchTenantList()
    } else {
      ElMessage.error(res.data.message || '批量删除失败')
    }
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('批量删除失败')
      console.error(err)
    }
  }
}

// 初始化获取数据
fetchTenantList()

// 监听搜索条件变化
watch(
    () => ({ ...filters.value }),
    () => {
      currentPage.value = 1
      debouncedSearch()
    },
    { deep: true }
)

// 表格多选变化
const handleSelectionChange = (val: Tenant[]): void => {
  multipleSelection.value = val
}

// 分页控制
const handleSizeChange = (val: number) => {
  pageSize.value = val
  currentPage.value = 1
  fetchTenantList()
}

const handlePageChange = (val: number) => {
  currentPage.value = val
  fetchTenantList()
}
</script>

<style scoped>
.search-bar {
  margin-bottom: 10px;
}
</style>
