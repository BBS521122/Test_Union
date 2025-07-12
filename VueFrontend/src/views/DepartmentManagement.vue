<template>
  <div class="department-management">
    <!-- 头部区域 -->
    <div class="header">
      <h1>组织管理系统</h1>
      <div class="user-info">
        <el-avatar>{{ user.name.charAt(0) }}</el-avatar>
        <div>
          <div>{{ user.name }} ({{ user.role }})</div>
          <div class="last-login">最后登录: {{ user.lastLogin }}</div>
        </div>
      </div>
    </div>

    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="部门名称">
          <el-input v-model="searchForm.deptName" clearable placeholder="输入部门名称" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" clearable placeholder="全部"  style="width: 100px">
            <el-option label="正常" :value="0" />
            <el-option label="停用" :value="1" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 操作按钮 -->
<div class="action-bar">
  <div>
    <el-button type="primary" @click="handleAdd">
      <el-icon><plus /></el-icon> 新增部门
    </el-button>
    <el-button @click="toggleExpandAll" style="margin-left: 10px;">
      {{ isAllExpanded ? '折叠全部' : '展开全部' }}
    </el-button>
  </div>

</div>

    <!-- 部门表格 -->
    <el-table
      :data="tableData"
      row-key="id"
      :tree-props="{ children: 'children' }"
      v-loading="loading"
      border
      ref="deptTableRef"
    >
<el-table-column prop="deptName" label="部门名称" width="300" />
  <el-table-column prop="sort" label="排序" width="300" />
  <el-table-column prop="status" label="状态" width="300">
    <template #default="{ row }">
      <el-tag :type="row.status === 0 ? 'success' : 'danger'">
        {{ row.status === 0 ? '正常' : '停用' }}
      </el-tag>
    </template>
  </el-table-column>
  <el-table-column prop="createTime" label="创建时间" min-width="500" />
  <el-table-column label="操作" width="500" fixed="right">
    <template #default="{ row }">
      <el-button size="small" type="primary" text @click="handleEdit(row)">
        <el-icon><Edit /></el-icon>
        修改
      </el-button>
      <el-button size="small" type="success" text @click="handleAddChild(row)">
        <el-icon><Plus /></el-icon>
        新增
      </el-button>
      <el-button size="small" type="danger" text @click="handleDelete(row)">
        <el-icon><Delete /></el-icon>
        删除
      </el-button>
    </template>
  </el-table-column>
    </el-table>

    <!-- 新增/编辑弹窗 -->
    <el-dialog 
      v-model="dialog.visible" 
      :title="dialog.title" 
      width="680px"
      :close-on-click-modal="false"
	  @close="resetForm"
    >
      <el-form 
        :model="form" 
        :rules="rules" 
        ref="formRef" 
        label-width="100px"
        label-position="right"
      >
        <el-form-item label="上级部门" prop="parentId">
          <el-tree-select
            v-model="form.parentId"
            :data="departmentOptions"
            :props="treeProps"
            check-strictly
            placeholder="选择上级部门"
            class="tree-select"
            clearable
          />
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="部门名称" prop="deptName">
              <el-input 
                v-model="form.deptName" 
                placeholder="请输入部门名称" 
                clearable
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="显示排序" prop="sort">
              <el-input-number
                v-model="form.sort"
                :min="0"
                :max="999"
                controls-position="right"
                placeholder="请输入排序"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="负责人" prop="manager">
              <el-input 
                v-model="form.manager" 
                placeholder="请输入负责人" 
                clearable
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系电话" prop="phone">
              <el-input 
                v-model="form.phone" 
                placeholder="请输入联系电话" 
                clearable
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="邮箱" prop="email">
              <el-input 
                v-model="form.email" 
                placeholder="请输入邮箱" 
                clearable
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="部门状态" prop="status">
              <el-radio-group v-model="form.status">
                <el-radio :value="0">正常</el-radio>
                <el-radio :value="1">停用</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialog.visible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete  } from '@element-plus/icons-vue'
import axios from 'axios'
 const allDepartments = ref([]) // 新增：用于存储所有部门的扁平列表
const formRef = ref(null)

// 用户信息
const user = reactive({
  name: localStorage.getItem('username'),
  role: localStorage.getItem('role'),
  lastLogin: new Date().toLocaleString()
})

// 搜索表单
const searchForm = reactive({
  deptName: '',
  status: ''
})

// 表格数据
const tableData = ref([])
const loading = ref(false)

// 弹窗控制
const dialog = reactive({
  visible: false,
  title: '新增部门',
  isEdit: false
})

// 表单数据
const form = reactive({
  id: null,
  parentId: null,
  deptName: '',
  manager: '',
  phone: '',
  email: '',
  sort: 0,
  status: 0
})

// 表单验证规则

const rules = {
  deptName: [
    { required: true, message: '部门名称不能为空，请输入部门名称', trigger: 'blur' },
    { min: 1, max: 50, message: '部门名称长度必须在 1 到 50 个字符之间', trigger: 'blur' }
  ],
  parentId: [
    { required: true, message: '上级部门不能为空，请选择上级部门', trigger: 'change' }
  ],
  sort: [
    { required: true, message: '显示排序不能为空，请输入排序值', trigger: 'blur' },
    { type: 'number', min: 0, max: 999, message: '排序值必须是数字，且范围在 0 到 999 之间', trigger: 'blur' }
  ]
}
// 部门树数据
const departmentOptions = ref([])
const treeProps = {
  value: 'id',
  label: 'deptName',
  children: 'children'
}

// 统计信息
const stats = computed(() => {
  const active = tableData.value.filter(d => d.status === 0).length
  const inactive = tableData.value.filter(d => d.status === 1).length
  return { active, inactive, total: active + inactive }
})

// 新增：表格ref和展开/折叠全部功能
const deptTableRef = ref(null)
const isAllExpanded = ref(false)

const toggleExpandAll = () => {
  if (!deptTableRef.value) return
  isAllExpanded.value = !isAllExpanded.value
  expandOrCollapseAll(tableData.value, isAllExpanded.value)
}

function expandOrCollapseAll(data, expand) {
  data.forEach(row => {
    deptTableRef.value.toggleRowExpansion(row, expand)
    if (row.children && row.children.length > 0) {
      expandOrCollapseAll(row.children, expand)
    }
  })
}

// 加载部门数据
    // 加载部门数据
    const loadData = async () => {
      loading.value = true
      try {
        const params = {
          deptName: searchForm.deptName,
          status: searchForm.status === '' ? null : searchForm.status
        }
        const response = await axios.get(`/search-dept`, { params })
        const flatData = response.data
        allDepartments.value = flatData // 保存完整的扁平数据

        // 当没有搜索条件时，构建表格所需的树状结构
        if (!searchForm.deptName && searchForm.status === '') {
          const buildTableTree = (parentId) => {
            return flatData
              .filter(item => item.parentId === parentId)
              .map(item => ({ ...item, children: buildTableTree(item.id) }))
          }
          // 假设顶层部门的 parentId 为 0
          tableData.value = buildTableTree(0)
        } else {
          // 搜索时，直接显示平铺结果
          tableData.value = flatData
        }
        
        buildDepartmentTree() // 使用完整数据构建下拉框选项
      } catch (error) {
        ElMessage.error(error.response?.data?.message || '查询失败')
      } finally {
        loading.value = false
      }
    }

    // 构建部门树形选项
const buildDepartmentTree = () => {
  const buildOptionsTree = (parentId) => {
    return allDepartments.value
      .filter(item => item.parentId === parentId)
      .map(item => ({
        id: item.id,
        deptName: item.deptName,
        children: buildOptionsTree(item.id)
      }))
  }
  // 只显示真实顶级部门
  departmentOptions.value = buildOptionsTree(0)
}

// 重置搜索
const resetSearch = () => {
  searchForm.deptName = ''
  searchForm.status = ''
  loadData()
}

// 新增部门
const handleAdd = () => {
  dialog.title = '新增部门'
  dialog.isEdit = false
  dialog.visible = true
  Object.assign(form, {
    id: null,
    parentId: 1,
    deptName: '',
    manager: '',
    phone: '',
    email: '',
    sort: 0,
    status: 0
  })
}
// 新增子部门
const handleAddChild = (row) => {
  dialog.title = '新增部门'
  dialog.isEdit = false
  dialog.visible = true
  Object.assign(form, {
    id: null,
    parentId: row.id,
    deptName: '',
    manager: '',
    phone: '',
    email: '',
    sort: 0,
    status: 0
  })
}

// 编辑部门
const handleEdit = (row) => {
  dialog.title = '修改部门'
  dialog.isEdit = true
  dialog.visible = true
  Object.assign(form, { ...row })
}

// 删除部门
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定删除 ${row.deptName} 吗？`, '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    // 修改为使用/delete-dept接口
    await axios.get(`/delete-dept?id=${row.id}`)
    ElMessage.success('删除成功')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      // 直接显示后端返回的错误信息
      const errorMsg = error.response?.data?.message || 
                     error.response?.data?.error || 
                     '删除失败'
      ElMessage.error(errorMsg)
    }
  }
}
// 关闭弹窗时重置表单状态
    const resetForm = () => {
      if (formRef.value) {
        formRef.value.clearValidate()
      }
    }

// 提交表单
const handleSubmit = async () => {
	
  try {
    // 表单验证
    await formRef.value.validate()
    
    if (dialog.isEdit) {
      // 修改为使用/update-dept接口
      await axios.post(`/update-dept`, form)
      ElMessage.success('修改成功')
    } else {
      // 修改为使用/add-dept接口
      await axios.post(`/add-dept`, form)
      ElMessage.success('新增成功')
    }
    dialog.visible = false
    loadData()
  } catch (error) {
    if (error.message) {
      // 表单验证错误 - 使用弹窗显示详细错误信息
      let errorTitle = '表单验证失败'
      let errorContent = error.message
      
      // 根据具体错误类型设置不同的标题
      if (error.message.includes('部门名称')) {
        errorTitle = '部门名称错误'
      } else if (error.message.includes('上级部门')) {
        errorTitle = '上级部门选择错误'
      } else if (error.message.includes('显示排序')) {
        errorTitle = '排序值错误'
      }
      
      ElMessageBox.alert(errorContent, errorTitle, {
        confirmButtonText: '确定',
        type: 'error'
      })
    } else {
      // 后端返回的错误信息 - 使用弹窗显示
let errorMsg = error.response?.data?.message || 
               error.response?.data?.error || 
               (dialog.isEdit ? '修改部门失败，请检查输入信息后重试' : '创建部门失败，请检查输入信息后重试')

let errorTitle = dialog.isEdit ? '修改失败' : '创建失败'
      
      
      // 根据后端错误信息设置不同的标题
      if (errorMsg.includes('已存在') || errorMsg.includes('重复')) {
        errorTitle = '部门已存在'
      } else if (errorMsg.includes('权限') || errorMsg.includes('无权限')) {
        errorTitle = '权限不足'
      } else if (errorMsg.includes('网络') || errorMsg.includes('连接')) {
        errorTitle = '网络连接错误'
      }
      
      ElMessageBox.alert(errorMsg, errorTitle, {
        confirmButtonText: '确定',
        type: 'error'
      })
    }
  }
}

// 初始化加载
onMounted(() => {
  loadData()
})
</script>

<style scoped>
.department-management {
  padding: 20px;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}
.last-login {
  font-size: 12px;
  color: #888;
}
.search-card {
  margin-bottom: 20px;
}
.action-bar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}
.stats {
  display: flex;
  gap: 10px;
}
.tree-select {
  width: 100%;
}
</style>